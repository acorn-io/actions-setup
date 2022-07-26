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

export async function resolveVersion(input: string, ignore?: string): Promise<string> {
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

  core.debug(`Got releases: ${repository.releases.nodes.map((x: any) => `${x.tag.name}: ${x.isPrerelease}`)}`)

  const release = repository.releases.nodes.find((x: any) => !x.isPrerelease && x.tag.name !== ignore)

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

  let arch = os.arch()
  if (platform === 'macos') {
    arch = 'universal'
  } else if (arch === 'x64') {
    arch = 'amd64'
  }

  core.debug(`Looking for version="${version}" platform="${platform}" arch="${arch}"`)

  const asset = repository.release.releaseAssets.nodes.find((x: any) => {
    const name = x.name.toLowerCase()

    const ok = name.startsWith(`acorn-${version}-${platform}-${arch}`) && !name.endsWith('.dmg')

    core.debug(`Testing "${name}": ${ok}`)

    return ok
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
