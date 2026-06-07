# web-speed-probe

A small browser-based speed test written in Go.

web-speed-probe provides a simple web page for testing connection speed to the server without installing additional tools on the client machine.

![web-speed-probe screenshot](./assets/screenshot.png)

## Features

- download speed test
- upload speed test
- latency test
- browser-only client
- single Go server
- no external frontend framework

## How it works

The server exposes a small web page and a few HTTP endpoints.

- `/ping` is used for latency checks
- `/download` streams data to the browser
- `/upload` receives uploaded data and discards it

The browser measures transfer time and calculates the final speed.

## Run

```bash
go run .
```

Open:

```txt
http://localhost:8080
```
