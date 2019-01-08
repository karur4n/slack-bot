import { Firestore } from '@google-cloud/firestore'

export function buildFirestore(): Firestore {
  return new Firestore({
    projectId: process.env.GCP_PROJECT
  })
}
