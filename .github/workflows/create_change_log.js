const repo = process.env.REPO;
const currentReleaseBranch = process.env.CURRENT_RELEASE_BRANCH

async function getListMergedPR(github) {
  const limit = 100
  let page = 1
  let listPRInfo = []
  let url = `/search/issues?per_page=${limit}&page=${page}`
  let result = await github.request(url, {
    q: `repo:${repo} is:pr is:merged base:${currentReleaseBranch}`
  })
  console.log(result)
  let dataSize = 0
  while (result.data.items.length != 0) {
    dataSize = result.data.items.length
    for (let i=0;i<dataSize;i++) {
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
      q: `repo:${repo} is:pr is:merged base:${currentReleaseBranch}`
    })
  }
  return listPRInfo 
}

async function getSubtaskForEachPR(github, listPR) {
    let listPRInfoWithSubtask = []

    const n = listPR.length
    const regex = /\bLT-\d{1,6}\b/

    let ticketNumberOfPR = ""
    let arrMatch = []
    let ticketNumberOfCommit = ""

    for (let i=0;i<n;i++) {
      let prInfoWithSubtask = {
        title: listPR[i].title,
        number: listPR[i].number,
        subtask: []
      }

      arrMatch = listPR[i].title.match(regex)


      if (arrMatch && arrMatch.length > 0) {
        ticketNumberOfPR = arrMatch[0]
        console.log("Ticket number of PR: " + ticketNumberOfPR)
      } else {
        listPRInfoWithSubtask.push(prInfoWithSubtask)
        continue
      }

      let listCommitOnPR = await getCommitOnPR(github, listPR[i].number)
      let setSubTask = new Set()
      let m = listCommitOnPR.length
      for (let j=0;j<m;j++) {
        console.log("Ticket number of PR: " + listCommitOnPR[j].message)
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

async function getCommitOnPR(github, prNumber) {
  let listCommitInfo = []
  const limit = 100
  let page = 1
  let dataSize = 0
  let url = `/repos/${repo}/pulls/${prNumber}/commits?per_page=${limit}&page=${page}`
  let result = await github.request(url)
  while (result.data.length != 0) {
    dataSize = result.data.length
    for (let i=0;i<dataSize;i++) {
      listCommitInfo.push({
        sha: result.data[i].sha,
        message: result.data[i].commit.message
      })
    }
    if (dataSize < limit) {
      break
    }
    page++
    url = `/repos/${repo}/pulls/${prNumber}/commits?per_page=${limit}&page=${page}`
    result = await github.request(url)
  }
  return listCommitInfo
}

async function updateCurrentPRDescription(github, prNumber, descriptionObject) {
  let changeLog = 
  `
  Features changes
  -------------------------------------------------------\n
  `

  const n = descriptionObject.length
  for (let i=0;i<n;i++) {
    if (descriptionObject[i].subtask.length > 0) {
      changeLog += `<p>${descriptionObject[i].title} (#${descriptionObject[i].number})</p><ul>`
      let m = descriptionObject[i].subtask.length
      for (let j=0;j<m;j++) {
        changeLog+=`<li>Sub task ${descriptionObject[i].subtask[j]}</li>`
      }
      changeLog += "</ul>"
    } else {
      changeLog += `<p>${descriptionObject[i].title} (#${descriptionObject[i].number})</p>`    
    }
  }

  changeLog += "</ul>"

  const url = `PATCH /repos/${repo}/pulls/${prNumber}`
  const result = await github.request(url, {
    body: changeLog
  })
  console.log(result)

}

module.exports = {
  getListMergedPR,
  getSubtaskForEachPR,
  updateCurrentPRDescription
}