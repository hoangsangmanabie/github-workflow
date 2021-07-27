const repo = process.env.REPO;
const currentReleaseBranch = process.env.CURRENT_RELEASE_BRANCH

module.exports.getListPRNumber = async function() {
    let listPRNumber = []

    let limit = 100
    let page = 1

    let url = `/repos/${ repo }/pulls?per_page=${ limit }&page=${ page }&base=${ currentReleaseBranch }`
    let result = await github.request(url)

    let dataSize = 0

    while (result.data.length != 0) {
      dataSize = result.data.length

      for (let i=0; i < dataSize; i++) {
        listPRNumber.push(result.data[i].number)
      }

      if (dataSize < limit) {
        break
      }

      page++

      url = `/repos/${ repo }/pulls?per_page=${ limit }&page=${ page }&base=${ currentReleaseBranch }`
      result = await github.request(url)
    }

    return listPRNumber
}