import * as core from '@actions/core'
import * as acorn from './acorn'
import * as k3s from './k3s'

async function setup(): Promise<void> {
  try {
    core.saveState('isPost', 'true')

    core.info('Installing k3s')
    const containerName = await k3s.install(core.getInput('k3s-version'))
    core.saveState('containerName', containerName)

    core.info('Looking up acorn version')
    const version = await acorn.resolveVersion(core.getInput('acorn-version'))
    const asset = await acorn.resolveAsset(version)

    core.info('Installing acorn')
    await acorn.installAsset(asset)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

async function teardown(): Promise<void> {
  const containerName = core.getState('containerName')
  const cleanup = core.getState('cleanup')

  if (cleanup === 'true') {
    core.info('Cleaning up k3s')
    await k3s.remove(containerName)
  }
}

async function run(): Promise<void> {
  if (core.getState('isPost')) {
    return teardown()
  } else {
    return setup()
  }
}

run()
