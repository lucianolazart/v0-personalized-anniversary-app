"use client"

import { useEffect } from "react"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "../lib/firebase"
import type { MediaWithId } from "../types/media"
import { compareEpisodes, type SeriesInfo } from "../lib/episodes"
import { seriesInfoUrl } from "../components/EpisodeTracker"

const CHECK_KEY = "series-check-day"

/**
 * Once a day per device, looks up every series marked "Al día" on TMDB. If an episode they
 * haven't seen is already out, the series moves to "Por retomar".
 */
export function useSeriesCheck(mediaList: MediaWithId[], loading: boolean) {
  useEffect(() => {
    if (loading) return
    const today = new Date().toDateString()
    try {
      if (window.localStorage.getItem(CHECK_KEY) === today) return
      window.localStorage.setItem(CHECK_KEY, today)
    } catch {
      // Without storage the check simply runs on every visit.
    }

    const series = mediaList.filter((media) => media.type === "serie" && media.state === "up-to-date")
    if (series.length === 0) return

    let cancelled = false
    void (async () => {
      for (const media of series) {
        if (cancelled) return
        try {
          const res = await fetch(seriesInfoUrl(media))
          if (!res.ok) continue
          const info = (await res.json()) as SeriesInfo
          if (!info.lastAired) continue
          const ids = { tmdbId: info.tmdbId, tmdbType: "tv" }
          if (!media.progress) {
            // Marked "Al día" before episodes were tracked: assume they saw everything out so far.
            await updateDoc(doc(db, "peliculas", media.id), { ...ids, progress: info.lastAired })
          } else if (compareEpisodes(media.progress, info.lastAired) < 0) {
            await updateDoc(doc(db, "peliculas", media.id), { ...ids, state: "to-resume" })
          }
        } catch (error) {
          console.error("Series check failed:", error)
        }
      }
    })()

    return () => {
      cancelled = true
    }
    // Runs once, when the catalog finishes loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])
}
