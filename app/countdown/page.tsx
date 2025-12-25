"use client"

import { useState, useEffect } from "react"

export default function CountdownPage() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  const targetDate = new Date("2026-05-10T00:00:00").getTime()

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const difference = targetDate - now

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        })
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      }
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [targetDate])

  const timeUnits = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="inline-flex items-center justify-center p-2 bg-[#FFEDD5] dark:bg-[#7C2D12]/30 rounded-full mb-4">
            <span className="text-3xl">✈️</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1 tracking-tight">
            Trip to Europe
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            May 10, 2026
          </p>
        </header>

        {/* Countdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {timeUnits.map((unit, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 text-center shadow-sm hover:shadow-md transition-all"
            >
              <div className="text-3xl sm:text-4xl font-bold text-[#EA580C] dark:text-[#FB923C] mb-2">
                {unit.value.toString().padStart(2, "0")}
              </div>
              <div className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {unit.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

