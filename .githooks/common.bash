#!/bin/bash

# regexp matches automated commit message of a local "git merge" or a "git pull" that requires a merge
regexp_merge="^(Merge (remote-tracking )?branch (.+)(of (.+) )?into (.+))$"

# regexp matches commit message which has exactly one LT-XXX (up to 6 digits)
# Jira has no upper limit on the ticket number but as of now, for us, it's impossible to reach 7 digits.
regexp_message="\bLT-\d{1,6}\b"

regexp_release_branch="release\/(20[2-9][1-9])(1[0-2]|0[1-9])(3[01]|[0-2][1-9]|[12]0)"

check_message() {
    message="$1"

    is_git_merge=$(echo ${message} | grep -o -P "${regexp_merge}" | wc -l)
    if [[ ${is_git_merge} == 1 ]]; then
        return 0
    fi

    match_count=$(echo ${message} | grep -o -P "${regexp_message}" | wc -l)
    if [[ ${match_count} != 1 ]]; then
        >&2 echo "ERROR: expect 1 Jira ticket ID in commit message, got ${match_count} (message: \"${message}\")"; return 1
    fi
    return 0
}

check_pr_title() {
    title="$1"
    match_count=$(echo ${title} | grep -o -P "${regexp_message}" | wc -l)
    if [[ ${match_count} != 1 ]]; then
        >&2 echo "ERROR: expect 1 Jira ticket ID in pull request's title, got ${match_count} (title: \"${title}\")"; return 1
    fi
    return 0
}

check_format_release_branch() {
  branch="$1"
  match_count=$(echo ${branch} | grep -o -P "${regexp_release_branch}" | wc -l)
  if [[ ${match_count} != 1 ]]; then
    >&2 echo "ERROR: release branch is not formatted"; return 0
  fi
  return 1
}

