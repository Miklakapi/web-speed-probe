const testStatus = document.querySelector('#test-status')

const mainSpeedValue = document.querySelector('#main-speed-value')
const mainSpeedUnit = document.querySelector('#main-speed-unit')
const progressBar = document.querySelector('#progress-bar')

const downloadValue = document.querySelector('#download-value')
const uploadValue = document.querySelector('#upload-value')
const latencyValue = document.querySelector('#latency-value')
const serverInfo = document.querySelector('#server-info')

const startTestButton = document.querySelector('#start-test-button')
const resetTestButton = document.querySelector('#reset-test-button')

init()

function init() {
    serverInfo.textContent = window.location.hostname

    startTestButton.addEventListener('click', testDownlaod)
}

async function testDownlaod() {
    startTestButton.disabled = true
    downloadValue.textContent = '-- ms'
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

        let receivedBytes = 0
        const start = performance.now()

        while (true) {
            const { done, value } = await reader.read()
            if (done) {
                break
            }

            receivedBytes += value.length

            const elapsedSeconds = (performance.now() - start) / 1000
            const mbps = calculateMbps(receivedBytes, elapsedSeconds)
            const progress = calculateProgress(receivedBytes, contentLength)

            const formattedSpeed = formatSpeedWithUnit(mbps)

            mainSpeedValue.textContent = formattedSpeed.value
            mainSpeedUnit.textContent = formattedSpeed.unit
            downloadValue.textContent = `${formattedSpeed.value} ${formattedSpeed.unit}`
            progressBar.style.width = `${progress}%`
        }

        progressBar.style.width = '100%'
        testStatus.textContent = 'Done'
    } catch (error) {
        console.error(error)

        downloadValue.textContent = '-- ms'
        mainSpeedValue.textContent = '0'
        mainSpeedUnit.textContent = 'Mbps'
        progressBar.style.width = '0%'
        testStatus.textContent = 'Test failed'
    } finally {
        startTestButton.disabled = false
    }
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

async function ping() {
    const response = await fetch('ping')

    if (!response.ok) {
        throw Error('Ping request failed')
    }
}

function getMedian(values) {
    const sortedValues = [...values].sort(function sortNumbers(left, right) {
        return left - right
    })

    const middleIndex = Math.floor(sortedValues.length / 2)

    if (sortedValues.length % 2 === 0) {
        return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2
    }

    return sortedValues[middleIndex]
}

function calculateMbps(bytes, seconds) {
    if (seconds <= 0) {
        return 0
    }

    return bytes * 8 / seconds / 1_000_000
}

function calculateProgress(currentBytes, totalBytes) {
    if (!Number.isFinite(totalBytes) || totalBytes <= 0) {
        return 0
    }

    return Math.min(currentBytes / totalBytes * 100, 100)
}

function formatSpeedWithUnit(mbps) {
    if (mbps >= 1000) {
        return {
            value: (mbps / 1000).toFixed(2),
            unit: 'Gbps',
        }
    }

    return {
        value: mbps.toFixed(1),
        unit: 'Mbps',
    }
}
