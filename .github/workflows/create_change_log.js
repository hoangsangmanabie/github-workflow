async function getReleasePR({ github, context }, currentReleaseBranch) {
  const url = `GET /repos/{owner}/{repo}/pulls?base=develop&head=${currentReleaseBranch}`
  const result = await github.request(url, {
    owner: context.repo.owner,
    repo: context.repo.repo
  })
  if (result.data.length != 0) {
    return result.data[0].number
  }
  console.error(`Not found any open PR that has base is "develop" and head is "${currentReleaseBranch}"`)
  return 0
}

async function getListMergedPR({ github, context }, currentReleaseBranch) {
  const limit = 100
  let page = 1
  let listPRInfo = []
  let url = `/search/issues?per_page=${limit}&page=${page}`
  let result = await github.request(url, {
    q: `repo:${context.repo.owner}/${context.repo.repo} is:pr is:merged base:${currentReleaseBranch}`
  })
  let dataSize = 0
  while (result.data.items.length != 0) {
    dataSize = result.data.items.length
    for (let i = 0; i < dataSize; i++) {
      listPRInfo.push({
        number: result.data.items[i].number,
        title: result.data.items[i].title
      })
    }
    if (dataSize < limit) {
      break
    }
    page++
    url = `/search/issues?per_page=${limit}&page=${page}`
    result = await github.request(url, {
      q: `repo:${context.repo.owner}/${context.repo.repo} is:pr is:merged base:${currentReleaseBranch}`
    })
  }
  return listPRInfo
}

async function getSubtaskForEachPR({ github, context }, listPR) {
  let listPRInfoWithSubtask = []

  const n = listPR.length
  const regex = /\bLT-\d{1,6}\b/

  let ticketNumberOfPR = ""
  let arrMatch = []
  let ticketNumberOfCommit = ""

  for (let i = 0; i < n; i++) {
    let prInfoWithSubtask = {
      title: listPR[i].title,
      number: listPR[i].number,
      subtask: []
    }

    arrMatch = listPR[i].title.match(regex)


    if (arrMatch && arrMatch.length > 0) {
      ticketNumberOfPR = arrMatch[0]
    } else {
      listPRInfoWithSubtask.push(prInfoWithSubtask)
      continue
    }

    let listCommitOnPR = await getCommitOnPR({ github, context }, listPR[i].number)
    let setSubTask = new Set()
    let m = listCommitOnPR.length

    for (let j = 0; j < m; j++) {
      arrMatch = listCommitOnPR[j].message.match(regex)

      if (arrMatch && arrMatch.length > 0) {
        ticketNumberOfCommit = arrMatch[0]
      } else {
        continue
      }

      if (ticketNumberOfCommit != ticketNumberOfPR) {
        setSubTask.add(ticketNumberOfCommit)
      }
    }

    for (let ticket of setSubTask) {
      prInfoWithSubtask.subtask.push(ticket)
    }

    listPRInfoWithSubtask.push(prInfoWithSubtask)

    ticketNumberOfCommit = ticketNumberOfPR = ""
  }
  return listPRInfoWithSubtask
}

async function getCommitOnPR({ github, context }, prNumber) {
  let listCommitInfo = []
  const limit = 100
  let page = 1
  let dataSize = 0
  let url = `/repos/{owner}/{repo}/pulls/{pull_number}/commits?per_page=${limit}&page=${page}`
  let result = await github.request(url, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: prNumber
  })
  while (result.data.length != 0) {
    dataSize = result.data.length
    for (let i = 0; i < dataSize; i++) {
      listCommitInfo.push({
        sha: result.data[i].sha,
        message: result.data[i].commit.message
      })
    }
    if (dataSize < limit) {
      break
    }
    page++
    url = `/repos/{owner}/{repo}/pulls/{pull_number}/commits?per_page=${limit}&page=${page}`
    result = await github.request(url, {
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: prNumber
    })
  }
  return listCommitInfo
}

async function updateCurrentPRDescription({ github, context }, prNumber, descriptionObject) {
  let changeLog =
  `
  All changes
  -------------------------------------------------------\n
  `

  const n = descriptionObject.length

  for (let i = 0; i < n; i++) {
    if (descriptionObject[i].subtask.length > 0) {
      changeLog += `<p>${i + 1}. ${descriptionObject[i].title} (#${descriptionObject[i].number})</p><ul>`
      let m = descriptionObject[i].subtask.length
      for (let j = 0; j < m; j++) {
        changeLog += `<li>Subtask ${descriptionObject[i].subtask[j]}</li>`
      }
      changeLog += "</ul>"
    } else {
      changeLog += `<p>${i + 1}. ${descriptionObject[i].title} (#${descriptionObject[i].number})</p>`
    }
  }

  changeLog += "</ul>"

  const url = `PATCH /repos/{owner}/{repo}/pulls/{pull_number}`
  await github.request(url, {
    body: changeLog,
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: prNumber
  })
}

module.exports = {
  getReleasePR,
  getListMergedPR,
  getSubtaskForEachPR,
  updateCurrentPRDescription
}