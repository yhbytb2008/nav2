// 开源项目，未经作者同意，不得以抄袭/复制代码/修改源代码版权信息。
// Copyright @ 2018-present xie.jiahe. All rights reserved.
// See https://github.com/xjh22222228/nav

import type { INavProps, IWebProps, INavTwoProp, INavThreeProp } from '../types'
import { navs } from '../store'
import { $t } from '../locale'
import { getTempId } from './utils'
import { removeTrailingSlashes } from './pureUtils'

let id = getTempId()

const getTitle = (node: Element): string => (node.textContent || '').trim()
const getUrl = (node: Element): string =>
  (node.getAttribute('href') || '').trim()
const getIcon = (node: Element): string =>
  (node.getAttribute('icon') || '').trim()

function findUnclassifiedData(roolDL: Element): IWebProps[] {
  const data: IWebProps[] = []
  Array.from(roolDL.children).forEach((iItem) => {
    if (iItem.nodeName === 'DT') {
      const a = iItem.firstElementChild
      if (a?.nodeName === 'A') {
        data.push({
          name: getTitle(a),
          icon: getIcon(a),
          url: getUrl(a),
          tags: [],
          desc: '',
          rate: 5,
          id: (id += 1),
          breadcrumb: [],
        })
      }
    }
  })
  return data
}

interface BookmarkParseResult {
  message?: string
  data?: INavProps[]
}

export function parseBookmark(
  htmlStr: string,
): BookmarkParseResult | INavProps[] {
  const copyWebList = JSON.parse(JSON.stringify(navs()))
  const data: INavProps[] = []
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlStr, 'text/html')
  const querySelector = htmlStr.includes('PERSONAL_TOOLBAR_FOLDER="true"')
    ? 'body dl dl'
    : 'body dl'
  const roolDL = doc.querySelector(querySelector)

  if (!roolDL) {
    return {
      message: '未找到dl dl节点',
    }
  }

  try {
    function processWebsiteLevel(DL3: Element, parentData: INavThreeProp) {
      Array.from(DL3.children).forEach((wItem) => {
        if (wItem.nodeName === 'DT') {
          const titleEl = wItem.querySelector('a')
          if (titleEl) {
            parentData.nav.push({
              name: getTitle(titleEl),
              url: getUrl(titleEl),
              desc: '',
              tags: [],
              rate: 5,
              top: false,
              icon: getIcon(titleEl),
              id: (id += 1),
              breadcrumb: [],
            })
          }
        }
      })
    }

    function processThreeLevel(DL3: Element, parentNav: INavTwoProp) {
      Array.from(DL3.children).forEach((kItem, index) => {
        if (kItem.nodeName === 'DT') {
          const titleEl = kItem.querySelector('h3')
          if (titleEl) {
            let title = getTitle(titleEl)
            const has = parentNav.nav.some((e) => e.title === title)
            if (has) {
              title = title + index
            }
            const threeLevel: INavThreeProp = {
              id: (id += 1),
              title,
              nav: [],
              icon: '',
            }
            parentNav.nav.push(threeLevel)

            const websiteDL = kItem.querySelector('dl')
            if (websiteDL) {
              processWebsiteLevel(websiteDL, threeLevel)
            }
          }
        }
      })
    }

    function processTwoLevel(DL: Element, parentData: INavProps) {
      Array.from(DL.children).forEach((jItem, index) => {
        if (jItem.nodeName === 'DT') {
          const titleEl = jItem.querySelector('h3')
          if (titleEl) {
            let title = getTitle(titleEl)
            const has = parentData.nav.some((e) => e.title === title)
            if (has) {
              title = title + index
            }
            const twoLevel: INavTwoProp = {
              id: (id += 1),
              title,
              icon: getIcon(titleEl),
              nav: [],
            }
            parentData.nav.push(twoLevel)

            const DL3 = jItem.querySelector('dl')
            if (DL3) {
              const unclassifiedData = findUnclassifiedData(DL3)
              if (unclassifiedData.length > 0) {
                twoLevel.nav.push({
                  id: (id += 1),
                  title,
                  icon: '',
                  nav: unclassifiedData,
                })
              }
              processThreeLevel(DL3, twoLevel)
            }
          }
        }
      })
    }

    // Process One Level
    Array.from(roolDL.children).forEach((iItem, index) => {
      if (iItem.nodeName === 'DT') {
        const titleEl = iItem.querySelector('h3')
        if (titleEl) {
          let title = getTitle(titleEl)
          const has = data.some((e) => e.title === title)
          if (has) {
            title = title + index
          }
          const oneLevel: INavProps = {
            id: (id += 1),
            title,
            icon: getIcon(titleEl),
            nav: [],
          }
          data.push(oneLevel)

          const DL = iItem.querySelector('dl')
          if (DL) {
            const unclassifiedData = findUnclassifiedData(DL)
            if (unclassifiedData.length > 0) {
              oneLevel.nav.push({
                id: (id += 1),
                title,
                icon: '',
                nav: [
                  {
                    id: (id += 1),
                    title,
                    icon: '',
                    nav: unclassifiedData,
                  },
                ],
              })
            }
            processTwoLevel(DL, oneLevel)
          }
        }
      }
    })

    const unclassifiedData = findUnclassifiedData(roolDL)
    if (unclassifiedData.length > 0) {
      data.push({
        id: (id += 1),
        title: $t('_uncategorized'),
        icon: '',
        nav: [
          {
            id: (id += 1),
            title: $t('_uncategorized'),
            icon: '',
            nav: [
              {
                id: (id += 1),
                title: $t('_uncategorized'),
                icon: '',
                nav: unclassifiedData,
              },
            ],
          },
        ],
      })
    }
  } catch (error) {
    console.log(error)
    throw error
  }

  // 增量导入
  function r(data: any[], list: any[]) {
    for (let i = 0; i < data.length; i++) {
      const item = data[i] as any
      const title = (item.title || removeTrailingSlashes(item.url)).trim()
      const idx = list.findIndex(
        (item) =>
          (item.title || removeTrailingSlashes(item.url)).trim() === title,
      )

      if (idx !== -1) {
        if (Array.isArray(item.nav)) {
          r(item.nav, list[idx].nav)
        }
      } else {
        const url = removeTrailingSlashes((item.url || '').trim())
        if (item.url) {
          const has = list.some(
            (e) => removeTrailingSlashes(e.url).trim() === url,
          )
          if (!has) {
            list.push(item)
          }
        }
        const title = (item.title || '').trim()
        if (item.title) {
          const has = list.some((e) => e.title?.trim() === title)
          if (!has) {
            list.push(item)
          }
        }
      }
    }
  }
  r(data, copyWebList)
  return copyWebList
}
