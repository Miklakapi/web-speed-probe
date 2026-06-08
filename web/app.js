"use strict"

import { ping, getMedian, calculateMbps, calculateProgress, formatSpeedWithUnit, getAverage } from "./utils.js"

const testStatus = document.querySelector('#test-status')

const mainSpeedValue = document.querySelector('#main-speed-value')
const mainSpeedUnit = document.querySelector('#main-speed-unit')
const progressBar = document.querySelector('#progress-bar')

const downloadTestButton = document.querySelector('#download-test-button')
const uploadTestButton = document.querySelector('#upload-test-button')
const latencyTestButton = document.querySelector('#latency-test-button')

const downloadValue = document.querySelector('#download-value')
const uploadValue = document.querySelector('#upload-value')
const latencyValue = document.querySelector('#latency-value')
const serverInfo = document.querySelector('#server-info')

const startTestButton = document.querySelector('#start-test-button')
const resetTestButton = document.querySelector('#reset-test-button')

const LATENCY_WARMUP_COUNT = 5
const LATENCY_MEASUREMENT_COUNT = 40
const DOWNLOAD_WARMUP_MS = 800
const DOWNLOAD_MEASUREMENT_INTERVAL_MS = 300
const DOWNLOAD_TIME = 5000
const UPLOAD_WARMUP_MS = 800
const UPLOAD_MEASUREMENT_INTERVAL_MS = 300
const UPLOAD_CHUNK_SIZE = 16 * 1024 * 1024
const UPLOAD_TIME = 5000

init()

function init() {
    serverInfo.textContent = window.location.hostname

    downloadTestButton.addEventListener('click', testDownload)
    uploadTestButton.addEventListener('click', testUpload)
    latencyTestButton.addEventListener('click', testLatency)
    startTestButton.addEventListener('click', testAll)
    resetTestButton.addEventListener('click', reset)
}

async function testAll() {
    await testLatency()
    await testDownload()
    await testUpload()
}

async function testUpload() {
    startTestButton.disabled = true
    resetTestButton.disabled = true
    uploadValue.textContent = '-- Mbps'
    mainSpeedValue.textContent = '0'
    mainSpeedUnit.textContent = 'Mbps'
    progressBar.style.width = '0%'
    testStatus.textContent = 'Testing upload...'

    try {
        const chunk = new Uint8Array(UPLOAD_CHUNK_SIZE)
        const measurements = []

        let sentBytes = 0
        let windowBytes = 0
        let lastMeasurementTime = performance.now()

        const start = performance.now()

        while (true) {
            const now = performance.now()
            const elapsedMs = now - start

            if (elapsedMs >= UPLOAD_TIME) {
                break
            }

            const response = await fetch('/upload', {
                method: 'POST',
                body: chunk,
                cache: 'no-store',
            })

            if (!response.ok) {
                throw new Error('Upload test failed')
            }

            const afterUpload = performance.now()
            const afterUploadElapsedMs = afterUpload - start

            sentBytes += chunk.length
            windowBytes += chunk.length

            const progress = calculateProgress(afterUploadElapsedMs, UPLOAD_TIME)
            progressBar.style.width = `${progress}%`

            const windowMs = afterUpload - lastMeasurementTime

            if (windowMs < UPLOAD_MEASUREMENT_INTERVAL_MS) {
                continue
            }

            const windowSeconds = windowMs / 1000
            const mbps = calculateMbps(windowBytes, windowSeconds)
            const formattedSpeed = formatSpeedWithUnit(mbps)

            mainSpeedValue.textContent = formattedSpeed.value
            mainSpeedUnit.textContent = formattedSpeed.unit

            if (afterUploadElapsedMs >= UPLOAD_WARMUP_MS) {
                measurements.push(mbps)
            }

            windowBytes = 0
            lastMeasurementTime = afterUpload
        }

        const fallbackSeconds = UPLOAD_TIME / 1000
        const fallbackMbps = calculateMbps(sentBytes, fallbackSeconds)
        const finalMbps = measurements.length > 0 ? getAverage(measurements) : fallbackMbps
        const formattedFinalSpeed = formatSpeedWithUnit(finalMbps)

        mainSpeedValue.textContent = formattedFinalSpeed.value
        mainSpeedUnit.textContent = formattedFinalSpeed.unit
        uploadValue.textContent = `${formattedFinalSpeed.value} ${formattedFinalSpeed.unit}`
        progressBar.style.width = '100%'
        testStatus.textContent = 'Done'
    } catch (error) {
        console.error(error)

        uploadValue.textContent = '-- Mbps'
        mainSpeedValue.textContent = '0'
        mainSpeedUnit.textContent = 'Mbps'
        progressBar.style.width = '0%'
        testStatus.textContent = 'Test failed'
    } finally {
        startTestButton.disabled = false
        resetTestButton.disabled = false
    }
}

async function testLatency() {
    startTestButton.disabled = true
    resetTestButton.disabled = true
    latencyValue.textContent = '-- ms'
    testStatus.textContent = 'Testing latency...'

    try {
        const measurements = []

        for (let i = 0; i < LATENCY_WARMUP_COUNT; i++) {
            await fetch('/ping')
        }

        for (let i = 0; i < LATENCY_MEASUREMENT_COUNT; i++) {
            const start = performance.now()
            await ping()
            const end = performance.now()

            measurements.push(end - start)
        }

        const median = getMedian(measurements)
        latencyValue.textContent = `${Math.round(median)} ms`

        testStatus.textContent = 'Done'
    } catch (error) {
        console.error(error)

        latencyValue.textContent = '-- ms'
        testStatus.textContent = 'Test failed'
    } finally {
        startTestButton.disabled = false
        resetTestButton.disabled = false
    }
}

async function testDownload() {
    startTestButton.disabled = true
    resetTestButton.disabled = true
    downloadValue.textContent = '-- Mbps'
    mainSpeedValue.textContent = '0'
    mainSpeedUnit.textContent = 'Mbps'
    progressBar.style.width = '0%'
    testStatus.textContent = 'Testing download...'

    let timeoutId = null

    try {
        const controller = new AbortController()
        const signal = controller.signal

        timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIME)

        const response = await fetch('/download', { signal: signal })
        if (!response.ok || !response.body) {
            throw new Error('Download test failed')
        }

        const reader = response.body.getReader()
        const measurements = []

        let receivedBytes = 0
        let windowBytes = 0
        let lastMeasurementTime = performance.now()

        const start = performance.now()

        while (true) {
            let result = null

            try {
                result = await reader.read()
            } catch (error) {
                if (error.name === 'AbortError') {
                    break
                }

                throw error
            }

            if (result.done) {
                break
            }

            const now = performance.now()
            const chunkBytes = result.value.length

            receivedBytes += chunkBytes
            windowBytes += chunkBytes

            const elapsedMs = now - start
            const progress = calculateProgress(elapsedMs, DOWNLOAD_TIME)
            progressBar.style.width = `${progress}%`

            const windowMs = now - lastMeasurementTime

            if (windowMs < DOWNLOAD_MEASUREMENT_INTERVAL_MS) {
                continue
            }

            const windowSeconds = windowMs / 1000
            const mbps = calculateMbps(windowBytes, windowSeconds)
            const formattedSpeed = formatSpeedWithUnit(mbps)

            mainSpeedValue.textContent = formattedSpeed.value
            mainSpeedUnit.textContent = formattedSpeed.unit

            if (now - start >= DOWNLOAD_WARMUP_MS) {
                measurements.push(mbps)
            }

            windowBytes = 0
            lastMeasurementTime = now
        }

        const fallbackSeconds = (performance.now() - start) / 1000
        const fallbackMbps = calculateMbps(receivedBytes, fallbackSeconds)
        const finalMbps = measurements.length > 0 ? getAverage(measurements) : fallbackMbps
        const formattedFinalSpeed = formatSpeedWithUnit(finalMbps)

        mainSpeedValue.textContent = formattedFinalSpeed.value
        mainSpeedUnit.textContent = formattedFinalSpeed.unit
        downloadValue.textContent = `${formattedFinalSpeed.value} ${formattedFinalSpeed.unit}`
        progressBar.style.width = '100%'
        testStatus.textContent = 'Done'
    } catch (error) {
        console.error(error)

        downloadValue.textContent = '-- Mbps'
        mainSpeedValue.textContent = '0'
        mainSpeedUnit.textContent = 'Mbps'
        progressBar.style.width = '0%'
        testStatus.textContent = 'Test failed'
    } finally {
        if (timeoutId !== null) {
            clearTimeout(timeoutId)
        }

        startTestButton.disabled = false
        resetTestButton.disabled = false
    }
}

function reset() {
    downloadValue.textContent = '-- Mbps'
    uploadValue.textContent = '-- Mbps'
    latencyValue.textContent = '-- ms'
    mainSpeedValue.textContent = '0'
    mainSpeedUnit.textContent = 'Mbps'
    progressBar.style.width = '0%'
    startTestButton.disabled = false
    testStatus.textContent = 'Ready'
}
