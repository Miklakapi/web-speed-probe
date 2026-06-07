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

    startTestButton.addEventListener('click', testLatency)
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
