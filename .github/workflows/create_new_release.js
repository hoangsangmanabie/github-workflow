const repo = process.env.REPO;
const currentReleaseBranch = process.env.CURRENT_RELEASE_BRANCH
const newReleaseBranch = process.env.NEW_RELEASE_BRANCH

async function getListPRNumber(github) {
  let listPRNumber = []

  let limit = 100
  let page = 1

  let url = `/repos/${repo}/pulls?per_page=${limit}&page=${page}&base=${currentReleaseBranch}`
  let result = await github.request(url)
  console.log(result)

  let dataSize = 0

  while (result.data.length != 0) {
    dataSize = result.data.length

    for (let i = 0; i < dataSize; i++) {
      listPRNumber.push(result.data[i].number)
    }

    if (dataSize < limit) {
      break
    }

    page++

    url = `/repos/${repo}/pulls?per_page=${limit}&page=${page}&base=${currentReleaseBranch}`
    result = await github.request(url)
  }

  return listPRNumber
}

async function requestChange(github, listPRNumber) {
  let requests = []
  const totalPR = listPRNumber.length
  let url = ""
  for (let i = 0; i < totalPR; i++) {
    url = `POST /repos/${repo}/pulls/${listPRNumber[i]}/reviews`
    requests.push(github.request(url, {
      event: "REQUEST_CHANGES",
      body: `Your current release branch is outdated. You must update your PR's base branch to the new release branch "${newReleaseBranch}"`
    }))
  }
  await Promise.all(requests)
}

module.exports = {
  getListPRNumber,
  requestChange
}