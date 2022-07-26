import * as core from '@actions/core'
import * as acorn from './acorn'
import * as k3s from './k3s'

async function setup(): Promise<void> {
  if (core.getBooleanInput('k3s-install')) {
    core.info('Installing k3s')
    const containerName = await k3s.install(core.getInput('k3s-version'))
    core.saveState('containerName', containerName)
  }

  core.info(`Selecting acorn version from: ${core.getInput('acorn-version')}`)
  const version = await acorn.resolveVersion(core.getInput('acorn-version'))

  core.info(`Looking up acorn version: ${version}`)
  const asset = await acorn.resolveAsset(version)

  core.info('Installing acorn')
  await acorn.installAsset(asset)

  if (core.getBooleanInput('acorn-init')) {
    core.info('Initializing acorn on cluster')
    await acorn.init()
  }
}

async function teardown(): Promise<void> {
  const containerName = core.getState('containerName')
  const cleanup = core.getBooleanInput('k3s-cleanup')

  if (containerName && cleanup) {
    core.info('Cleaning up k3s')
    await k3s.remove(containerName)
  }
}

async function run(): Promise<void> {
  try {
    if (core.getState('isPost')) {
      await teardown()
    } else {
      core.saveState('isPost', 'true')
      await setup()
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
