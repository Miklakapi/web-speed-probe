"use strict"

export async function ping() {
    const response = await fetch('ping')

    if (!response.ok) {
        throw Error('Ping request failed')
    }
}

export function getMedian(values) {
    const sortedValues = [...values].sort(function sortNumbers(left, right) {
        return left - right
    })

    const middleIndex = Math.floor(sortedValues.length / 2)

    if (sortedValues.length % 2 === 0) {
        return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2
    }

    return sortedValues[middleIndex]
}

export function calculateMbps(bytes, seconds) {
    if (seconds <= 0) {
        return 0
    }

    return bytes * 8 / seconds / 1_000_000
}

export function calculateProgress(currentBytes, totalBytes) {
    if (!Number.isFinite(totalBytes) || totalBytes <= 0) {
        return 0
    }

    return Math.min(currentBytes / totalBytes * 100, 100)
}

export function formatSpeedWithUnit(mbps) {
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
