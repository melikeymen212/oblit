<div align="center">
  <h1>OBLIT</h1>
  <p>
    <b>Obliterate Latency.</b> Zero-Dependency, High-Performance Binary Protocol for Node.js.
  </p>

  <!-- ROZETLER BURAYA -->
  <a href="https://www.npmjs.com/package/oblit">
    <img src="https://img.shields.io/npm/v/oblit?color=red&style=for-the-badge" alt="Version">
  </a>
  <a href="https://bundlephobia.com/result?p=oblit">
    <img src="https://img.shields.io/bundlephobia/minzip/oblit?label=Lightweight&style=for-the-badge&color=success" alt="Size">
  </a>
  <a href="https://github.com/KULLANICI_ADIN/oblit">
    <img src="https://img.shields.io/badge/dependencies-0-brightgreen?style=for-the-badge" alt="Zero Dependencies">
  </a>
</div>

<hr />

## ⚡ Why Oblit?

Modern apps suffer from **JSON bloat**. Sending `{ "x": 100, "y": 200 }` over the network wastes bytes on brackets, quotes, and keys.

**OBLIT** solves this by converting your data into **pure binary buffers**. It cuts your bandwidth usage in half while maintaining extreme speed.

### 📊 Real World Benchmark (50,000 Messages)

| Metric | Standard JSON | 🛡️ OBLIT | Impact |
| :--- | :--- | :--- | :--- |
| **Traffic Volume** | **1318 KB** | **585 KB** | 📉 **55% Savings** |
| **Packet Size** | 27 Bytes | 12 Bytes | ⚡ **2x Smaller** |
| **Dependency Count**| Many | **0** | 🛡️ **Pure Code** |

> *Test environment: Node.js v22, Localhost throughput test.*

---

## 🚀 Installation

```bash
npm install oblit