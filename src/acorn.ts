import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as github from '@actions/github'
import * as tc from '@actions/tool-cache'
import os from 'os'

const octokit = github.getOctokit(core.getInput('token'))

interface Asset {
  version: string
  platform: string
  arch: string
  url: string
}

export async function resolveVersion(input: string): Promise<string> {
  if (input && input !== 'latest') {
    if (input.startsWith('v')) {
      return input
    }

    return `v${input}`
  }

  const {repository} = await octokit.graphql(`{
    repository(owner: "acorn-io", name: "acorn") {
      releases(first:100, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes {
          id
          tag {
            name
          }
          isPrerelease
        }
      }
    }
  }`)

  const release = repository.releases.nodes.find((x: any) => !x.isPrerelease)

  if (!release) {
    throw new Error('No latest release found')
  }

  return release.tag.name
}

export async function resolveAsset(version: string): Promise<Asset> {
  const {repository} = await octokit.graphql(
    `
  query($tag: String!) {
    repository(owner:"acorn-io",name:"acorn") {
      release(tagName: $tag) {
        releaseAssets(first: 100) {
          nodes {
            name
            url
          }
        }
      }
    }
  }`,
    {tag: version}
  )

  let platform = `${os.platform()}`
  if (platform === 'darwin') {
    platform = 'macos'
  }

  const arch = platform === 'macos' ? 'universal' : os.arch()

  const asset = repository.release.releaseAssets.nodes.find((x: any) => {
    const name = x.name.toLowerCase()

    return name.startsWith(`acorn-${version}-${platform}-${arch}`) && !name.endsWith('.dmg')
  })

  if (!asset) {
    throw new Error('No release asset found')
  }

  return Promise.resolve({
    version,
    platform,
    arch,
    url: asset.url
  } as Asset)
}

export async function installAsset(asset: Asset): Promise<void> {
  const downloaded = await tc.downloadTool(asset.url)
  const dir = await tc.extractTar(downloaded, '')

  const cachedPath = await tc.cacheDir(dir, 'acorn', asset.version)
  core.addPath(cachedPath)
  core.setOutput('acorn-version', asset.version)
}

export async function init(): Promise<void> {
  await exec.getExecOutput('acorn init')
}
