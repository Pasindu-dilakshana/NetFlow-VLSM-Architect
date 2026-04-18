# 🌐 NetFlow | Visual Subnet & VLAN Engine

NetFlow is a high-performance, enterprise-grade networking tool designed for Network Architects and Systems Administrators. It simplifies complex Variable Length Subnet Masking (VLSM) calculations and automates Cisco IOS configuration scripts with a focus on precision and modern UI/UX.

## 🚀 Features

- **VLSM Engine:** Automatically calculates subnets based on host requirements, prioritizing efficiency and minimizing IP waste.
- **Cisco IOS Automation:** Generates production-ready CLI scripts for Layer 3 Switches (SVIs) and Edge Routers (Sub-interfaces).
- **Dual-Stack Support:** Full support for IPv4 (VLSM) and IPv6 (Standard /64).
- **Intelligent UX:**
  - **Auto-Correction:** Detects and fixes invalid Network IDs based on CIDR boundaries.
  - **Local Persistence:** Saves your network architecture in the browser's `localStorage`.
  - **One-Click Copy:** Instant clipboard copy for IP addresses and ranges.
  - **Advanced Mode:** Toggle between basic subnetting and advanced VLAN routing.

## 🛠️ Tech Stack

- **Frontend:** React.js, Vite
- **Styling:** Tailwind CSS
- **State Management:** React Hooks (useState, useMemo, useEffect)
- **Deployment:** Vercel / Netlify

## 🧠 Logic & Mathematical Flow

NetFlow operates on a 5-step logical pipeline:
1. **Bitwise Conversion:** Converts dotted-decimal IPs into 32-bit integers for high-speed arithmetic.
2. **Network Alignment:** Applies bitwise AND masks to ensure the starting IP aligns with valid network boundaries.
3. **Largest-First Allocation:** Sorts department requirements by host count to ensure the most efficient use of address space.
4. **Power-of-2 Sizing:** Dynamically calculates block sizes to the nearest power of 2 ($2^n$) to comply with standard subnetting rules.
5. **Boundary Mapping:** Maps out Network IDs, Broadcast IDs, and usable ranges with overflow protection.

---
Developed with ❤️ by [Pasindu]
=======
# NetFlow-VLSM-Architect
A professional, modern VLSM Subnet Calculator and Cisco IOS Configuration Generator built with React and Tailwind CSS.
