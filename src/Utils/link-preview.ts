import type { WAMediaUploadFunction, WAUrlInfo } from '../Types'
import type { ILogger } from './logger'
import { prepareWAMessageMedia } from './messages'
import { extractImageThumb, getHttpStream } from './messages-media'

/**
 * Expanded thumbnail size to closely match official WA Web / mobile previews.
 * 720px is empirically safe and renders visibly larger without preview drop.
 */
const THUMBNAIL_WIDTH_PX = 720

/**
 * WhatsApp Web soft-limit for inline JPEG thumbnails.
 * Exceeding this may silently drop the preview.
 */
const MAX_THUMBNAIL_BYTES = 256_000

/** Fetches an image and generates a high-quality thumbnail for it */
const getCompressedJpegThumbnail = async (
	url: string,
	{ thumbnailWidth, fetchOpts }: URLGenerationOptions
) => {
	const stream = await getHttpStream(url, fetchOpts)
	const thumb = await extractImageThumb(stream, thumbnailWidth)

	// Hard safety cap to avoid WA discarding preview
	if (thumb.length > MAX_THUMBNAIL_BYTES) {
		return thumb.slice(0, MAX_THUMBNAIL_BYTES)
	}

	return thumb
}

export type URLGenerationOptions = {
	thumbnailWidth: number
	fetchOpts: {
		/** Timeout in ms */
		timeout: number
		proxyUrl?: string
		headers?: HeadersInit
	}
	uploadImage?: WAMediaUploadFunction
	logger?: ILogger
}

/**
 * Given a piece of text, checks for any URL present, generates link preview for the same and returns it
 * Return undefined if the fetch failed or no URL was found
 * @param text first matched URL in text
 * @returns the URL info required to generate link preview
 */
export const getUrlInfo = async (
	text: string,
	opts: URLGenerationOptions = {
		thumbnailWidth: THUMBNAIL_WIDTH_PX,
		fetchOpts: { timeout: 3000 }
	}
): Promise<WAUrlInfo | undefined> => {
	try {
		let retries = 0
		const maxRetry = 5

		const { getLinkPreview } = await import('link-preview-js')
		let previewLink = text
		if (!text.startsWith('https://') && !text.startsWith('http://')) {
			previewLink = 'https://' + previewLink
		}

		const info = await getLinkPreview(previewLink, {
			...opts.fetchOpts,
			followRedirects: 'follow',
			handleRedirects: (baseURL: string, forwardedURL: string) => {
				if (retries >= maxRetry) return false

				const base = new URL(baseURL)
				const next = new URL(forwardedURL)

				if (
					next.hostname === base.hostname ||
					next.hostname === 'www.' + base.hostname ||
					'www.' + next.hostname === base.hostname
				) {
					retries++
					return true
				}

				return false
			},
			headers: opts.fetchOpts?.headers as {}
		})

		if (info && 'title' in info && info.title) {
			const [image] = info.images ?? []

			const urlInfo: WAUrlInfo = {
				'canonical-url': info.url,
				'matched-text': text,
				title: info.title,
				description: info.description,
				originalThumbnailUrl: image
			}

			// Prefer upload-based high-quality path when available
			if (opts.uploadImage && image) {
				const { imageMessage } = await prepareWAMessageMedia(
					{ image: { url: image } },
					{
						upload: opts.uploadImage,
						mediaTypeOverride: 'thumbnail-link',
						options: opts.fetchOpts
					}
				)

				if (imageMessage?.jpegThumbnail) {
					const buf = Buffer.from(imageMessage.jpegThumbnail)
					urlInfo.jpegThumbnail =
						buf.length > MAX_THUMBNAIL_BYTES
							? buf.slice(0, MAX_THUMBNAIL_BYTES)
							: buf
				}

				urlInfo.highQualityThumbnail = imageMessage || undefined
			} else if (image) {
				try {
					urlInfo.jpegThumbnail = await getCompressedJpegThumbnail(image, opts)
				} catch (error: any) {
					opts.logger?.debug(
						{ err: error.stack, url: previewLink },
						'error in generating thumbnail'
					)
				}
			}

			// Explicit dimensions improve render consistency
			;(urlInfo as any).thumbnailWidth = opts.thumbnailWidth
			;(urlInfo as any).thumbnailHeight = opts.thumbnailWidth

			return urlInfo
		}
	} catch (error: any) {
		if (!error.message?.includes('receive a valid')) {
			throw error
		}
	}
}
