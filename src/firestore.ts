import { Firestore } from '@google-cloud/firestore'

export const buildFirestore = (() => {
  let instance: Firestore | undefined = undefined

  return function(): Firestore {
    if (instance) {
      return instance
    }

    instance = new Firestore({
      projectId: process.env.GCP_PROJECT
    })

    return instance
  }
})()
