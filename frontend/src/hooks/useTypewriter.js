import { useState, useEffect, useRef } from 'react'

const DEFAULT_SPEED = { type: 65, delete: 35, pause: 2200, between: 400 }

/**
 * Efecto typewriter: escribe letra a letra, pausa, borra y pasa al siguiente texto.
 * Se pausa cuando `paused` es true (ej. input con foco o valor del usuario).
 */
export function useTypewriter(phrases, options = {}) {
  const { typeSpeed = DEFAULT_SPEED.type, deleteSpeed = DEFAULT_SPEED.delete, pauseDuration = DEFAULT_SPEED.pause, betweenPhrases = DEFAULT_SPEED.between, paused = false } = options

  const [displayText, setDisplayText] = useState('')
  const phraseIndex = useRef(0)
  const charIndex = useRef(0)
  const isDeleting = useRef(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (paused || !phrases?.length) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      return
    }

    const tick = () => {
      const currentPhrase = phrases[phraseIndex.current]

      if (!isDeleting.current) {
        charIndex.current += 1
        setDisplayText(currentPhrase.slice(0, charIndex.current))

        if (charIndex.current === currentPhrase.length) {
          isDeleting.current = true
          timeoutRef.current = setTimeout(tick, pauseDuration)
          return
        }
        timeoutRef.current = setTimeout(tick, typeSpeed)
      } else {
        charIndex.current -= 1
        setDisplayText(currentPhrase.slice(0, charIndex.current))

        if (charIndex.current === 0) {
          isDeleting.current = false
          phraseIndex.current = (phraseIndex.current + 1) % phrases.length
          timeoutRef.current = setTimeout(tick, betweenPhrases)
          return
        }
        timeoutRef.current = setTimeout(tick, deleteSpeed)
      }
    }

    timeoutRef.current = setTimeout(tick, typeSpeed)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [phrases, paused, typeSpeed, deleteSpeed, pauseDuration, betweenPhrases])

  return displayText
}
