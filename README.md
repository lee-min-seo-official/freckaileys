# Freckaileys

⚡ **Freckaileys** is a **high-performance, modified fork** of  
[@whiskeysockets/baileys](https://github.com/whiskeysockets/baileys), focused on **speed optimizations, extended message control, and experimental protocol behavior** for advanced WhatsApp bots.

> Built for developers who know what they’re doing.

---

## 🚀 What is Freckaileys?

Freckaileys is **not a replacement** for Baileys — it is a **power-user fork** designed for:

- Faster message dispatch
- Reduced internal overhead
- Extended control over message payloads
- Experimental features not available in upstream Baileys
- Easier patching for research & private bots

This project assumes you are **comfortable maintaining your own fork** and understand WhatsApp Web limitations.

---

## ✨ Key Differences from Baileys

Compared to upstream Baileys, Freckaileys may include:

- ⚡ Optimized message sending pipeline  
- 🔁 Reduced ACK / retry overhead (configurable)
- 🧵 Better parallel message handling
- 🧪 Experimental payload & context manipulation
- 🛠️ Easier internal patch points
- 🧹 Removed or relaxed non-critical validations

> Some features may trade safety for performance. Use responsibly.

---

## ⚠️ Important Disclaimer

Freckaileys **does NOT bypass WhatsApp server-side limits**.

- Excessive speed **can result in rate limits or bans**
- Some modifications are **experimental**
- WhatsApp Web protocol is **undocumented and subject to change**

You are **fully responsible** for how you use this library.

---

## 📦 Installation

```bash
npm install freckaileys

