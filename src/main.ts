import * as core from '@actions/core'
import * as acorn from './acorn'
import * as k3s from './k3s'
import {writeFileSync, existsSync, mkdirSync} from 'fs'
import {resolve} from 'path'

async function setup(): Promise<void> {
  const kubeconfig = core.getInput('kubeconfig')

  const initStr = core.getInput('acorn-init')
  let init = false

  if (initStr === 'auto') {
    init = !kubeconfig
  } else {
    init = core.getBooleanInput('acorn-init')
  }

  if (kubeconfig) {
    core.info(`Applying kubeconfig`)

    if (!existsSync('.kube')) {
      mkdirSync('.kube')
    }

    const path = resolve('.kube/config')

    core.info(`Wrote kubeconfig to: ${path}`)
    writeFileSync(path, kubeconfig)
    process.env.KUBECONFIG = path
    core.exportVariable('KUBECONFIG', path)
  } else if (core.getBooleanInput('k3s-install')) {
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

  if (init) {
    core.info('Initializing acorn on cluster')
    await acorn.init()
  } else {
    core.info('Skipping acorn init')
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
