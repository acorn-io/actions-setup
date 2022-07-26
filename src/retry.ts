import wait from './wait'
import * as core from '@actions/core'

export default async function retry<T>(fn: () => Promise<T>, msg = 'Retrying', tries = 10, delay = 2): Promise<T | undefined> {
  let count = 1
  while (count <= tries) {
    try {
      const res = await fn()

      if (res) {
        return res
      }
    } catch (e) {
      // Nothing
    }

    count++
    core.info(`${msg} ${count}/${tries}`)
    await wait(delay * 1000)
  }

  return undefined
}
