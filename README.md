# Suchnode - dVPN Node Explorer

A visually appealing and modern dashboard for exploring decentralized VPN (dVPN) nodes. This project provides a user-friendly interface to view node status, protocols, prices, and geolocation data.

## Features

- **Real-time Node Status**: Visual indicators for healthy/unhealthy nodes.
- **Advanced Filtering**: Filter by country, protocol (WireGuard, V2Ray), and price.
- **Responsive Design**: Built with Tailwind CSS for a seamless mobile and desktop experience.
- **Dynamic Search**: Search nodes by moniker or wallet address.
- **Pagination**: Efficiently browse through large lists of nodes.

## Technologies

- **Frontend**: HTML5, Vanilla JavaScript
- **Styling**: Tailwind CSS v4
- **Backend/Proxy**: PHP (for handling cross-origin requests or API caching)

## Setup

1. Clone the repository.
2. Ensure you have a web server running (Apache/Nginx/Caddy) with PHP support.
3. Serve the directory.

## Development

To watch and build the Tailwind CSS output:

```bash
npx @tailwindcss/cli -i ./src/input.css -o ./src/output.css --watch
```

To build for production (minified):

```bash
npx @tailwindcss/cli -i ./src/input.css -o ./src/output.css --minify
```
