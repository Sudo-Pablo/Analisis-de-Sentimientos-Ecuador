const ONBOARDING_STORAGE_KEY = 'sentiment_analyzer_onboarding_v1'
const TOPIC_TOUR_STORAGE_KEY = 'sentiment_analyzer_topic_tour_v1'
const TIKTOK_TOUR_STORAGE_KEY = 'sentiment_analyzer_tiktok_tour_v1'
const FACEBOOK_TOUR_STORAGE_KEY = 'sentiment_analyzer_facebook_tour_v1'

export const START_ONBOARDING_EVENT = 'onboarding:start'
export const START_TOPIC_TOUR_EVENT = 'onboarding:topic-start'
export const START_TIKTOK_TOUR_EVENT = 'onboarding:tiktok-start'
export const START_FACEBOOK_TOUR_EVENT = 'onboarding:facebook-start'
export const EXPAND_TIKTOK_PARAMS_EVENT = 'onboarding:expand-tiktok-params'
export const EXPAND_FACEBOOK_PARAMS_EVENT = 'onboarding:expand-facebook-params'

const readDone = (key) => {
  try {
    return localStorage.getItem(key) === 'done'
  } catch {
    return true
  }
}

const writeDone = (key) => {
  try {
    localStorage.setItem(key, 'done')
  } catch {
    /* ignore private mode / quota */
  }
}

const clearDone = (key) => {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export const hasCompletedOnboarding = () => readDone(ONBOARDING_STORAGE_KEY)
export const markOnboardingComplete = () => writeDone(ONBOARDING_STORAGE_KEY)
export const resetOnboarding = () => clearDone(ONBOARDING_STORAGE_KEY)

export const requestOnboardingRestart = () => {
  resetOnboarding()
  window.dispatchEvent(new CustomEvent(START_ONBOARDING_EVENT))
}

export const hasCompletedTopicTour = () => readDone(TOPIC_TOUR_STORAGE_KEY)
export const markTopicTourComplete = () => writeDone(TOPIC_TOUR_STORAGE_KEY)
export const resetTopicTour = () => clearDone(TOPIC_TOUR_STORAGE_KEY)

export const requestTopicTourRestart = () => {
  resetTopicTour()
  window.dispatchEvent(new CustomEvent(START_TOPIC_TOUR_EVENT))
}

export const hasCompletedTikTokTour = () => readDone(TIKTOK_TOUR_STORAGE_KEY)
export const markTikTokTourComplete = () => writeDone(TIKTOK_TOUR_STORAGE_KEY)
export const resetTikTokTour = () => clearDone(TIKTOK_TOUR_STORAGE_KEY)

export const requestTikTokTourRestart = () => {
  resetTikTokTour()
  window.dispatchEvent(new CustomEvent(START_TIKTOK_TOUR_EVENT))
}

export const hasCompletedFacebookTour = () => readDone(FACEBOOK_TOUR_STORAGE_KEY)
export const markFacebookTourComplete = () => writeDone(FACEBOOK_TOUR_STORAGE_KEY)
export const resetFacebookTour = () => clearDone(FACEBOOK_TOUR_STORAGE_KEY)

export const requestFacebookTourRestart = () => {
  resetFacebookTour()
  window.dispatchEvent(new CustomEvent(START_FACEBOOK_TOUR_EVENT))
}
