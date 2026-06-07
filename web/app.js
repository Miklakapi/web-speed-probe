"use strict"

import { ping, getMedian, calculateMbps, calculateProgress, formatSpeedWithUnit } from "./utils.js"

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

init()

function init() {
    serverInfo.textContent = window.location.hostname

    downloadTestButton.addEventListener('click', testDownlaod)
    uploadTestButton.addEventListener('click', testUpload)
    latencyTestButton.addEventListener('click', testLatency)
    startTestButton.addEventListener('click', testUpload)
    resetTestButton.addEventListener('click', reset)
}

async function testUpload() {
    startTestButton.disabled = true
    uploadValue.textContent = '-- Mbps'
    mainSpeedValue.textContent = '0'
    mainSpeedUnit.textContent = 'Mbps'
    progressBar.style.width = '0%'
    testStatus.textContent = 'Testing upload...'
}

async function testLatency() {
    startTestButton.disabled = true
    latencyValue.textContent = '-- ms'
    testStatus.textContent = 'Testing latency...'

    try {
        const warmupCount = 5
        const measurementCount = 20
        const measurements = []

        for (let i = 0; i < warmupCount; i++) {
            await fetch('/ping')
        }

        for (let i = 0; i < measurementCount; i++) {
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
    }
}

async function testDownlaod() {
    startTestButton.disabled = true
    downloadValue.textContent = '-- Mbps'
    mainSpeedValue.textContent = '0'
    mainSpeedUnit.textContent = 'Mbps'
    progressBar.style.width = '0%'
    testStatus.textContent = 'Testing downlaod...'

    try {
        const response = await fetch('/download')
        if (!response.ok) {
            throw new Error('Download test failed')
        }

        const reader = response.body.getReader()
        const contentLength = Number(response.headers.get('Content-Length'))

        const measurementIntervalMs = 300
        const warmupMs = 800
        const measurements = []

        let receivedBytes = 0
        let windowBytes = 0
        let lastMeasurementTime = performance.now()

        const start = performance.now()

        while (true) {
            const { done, value } = await reader.read()
            if (done) {
                break
            }

            const now = performance.now()
            const chunkBytes = value.length

            receivedBytes += chunkBytes
            windowBytes += chunkBytes

            const progress = calculateProgress(receivedBytes, contentLength)
            progressBar.style.width = `${progress}%`

            const windowMs = now - lastMeasurementTime

            if (windowMs < measurementIntervalMs) {
                continue
            }

            const windowSeconds = windowMs / 1000
            const mbps = calculateMbps(windowBytes, windowSeconds)
            const formattedSpeed = formatSpeedWithUnit(mbps)

            mainSpeedValue.textContent = formattedSpeed.value
            mainSpeedUnit.textContent = formattedSpeed.unit

            if (now - start >= warmupMs) {
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
        startTestButton.disabled = false
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
