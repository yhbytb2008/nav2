// 开源项目，未经作者同意，不得以抄袭/复制代码/修改源代码版权信息。
// Copyright @ 2018-present xiejiahe. All rights reserved.
// See https://github.com/xjh22222228/nav

import { Component, Output, EventEmitter, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { isDark as isDarkFn } from 'src/utils'
import { NzModalService } from 'ng-zorro-antd/modal'
import { NzMessageService } from 'ng-zorro-antd/message'
import { isLogin } from 'src/utils/user'
import { updateFileContent } from 'src/api'
import { navs, settings } from 'src/store'
import { DB_PATH, STORAGE_KEY_MAP } from 'src/constants'
import { Router } from '@angular/router'
import { $t, getLocale } from 'src/locale'
import { addDark, removeDark, isSelfDevelop } from 'src/utils/utils'
import { NzDropDownModule } from 'ng-zorro-antd/dropdown'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'
import { cleanWebAttrs } from 'src/utils/pureUtils'
import mitt from 'src/utils/mitt'
import { fromEvent, Subscription } from 'rxjs'
import { debounceTime } from 'rxjs/operators'
import { unregisterServiceWorkers, isPwaMode } from 'src/utils/sw'

@Component({
  standalone: true,
  imports: [CommonModule, NzDropDownModule, NzToolTipModule],
  selector: 'app-fixbar',
  templateUrl: './index.component.html',
  styleUrls: ['./index.component.scss'],
  providers: [NzModalService, NzMessageService],
})
export class FixbarComponent {
  @Input() showTop: boolean = true
  @Input() showCollapse: boolean = true
  @Input() collapsed: boolean = false
  @Input() selector: string = ''
  @Output() onCollapse = new EventEmitter()

  readonly $t = $t
  readonly settings = settings()
  readonly language = getLocale()
  readonly isLogin = isLogin
  private scrollSubscription: Subscription | null = null
  readonly isSelfDevelop = isSelfDevelop
  readonly isPwaMode = isPwaMode() && window.__PWA_ENABLE__
  isDark: boolean = isDarkFn()
  isShowFace = true
  isShowTop = false
  entering = false
  checking = false
  open = localStorage.getItem(STORAGE_KEY_MAP.FIXBAR_OPEN) === 'true'
  themeList = [
    {
      name: $t('_switchTo') + ' Super',
      url: '/super',
    },
    {
      name: $t('_switchTo') + ' Light',
      url: '/light',
    },
    {
      name: $t('_switchTo') + ' Sim',
      url: '/sim',
    },
    {
      name: $t('_switchTo') + ' Side',
      url: '/side',
    },
    {
      name: $t('_switchTo') + ' Shortcut',
      url: '/shortcut',
    },
    {
      name: $t('_switchTo') + ' App',
      url: '/app',
    },
  ]

  constructor(
    private message: NzMessageService,
    private modal: NzModalService,
    private router: Router,
  ) {
    if (this.isDark) {
      addDark()
    }

    const url = this.router.url.split('?')[0]
    const defaultTheme = this.settings.theme?.toLowerCase?.()
    this.themeList = this.themeList
      .map((item) => {
        if (item.url === '/' + defaultTheme) {
          item.url = '/'
        }
        return item
      })
      .filter((t) => {
        if (
          url === '/' &&
          url + this.settings.theme?.toLowerCase?.() === t.url
        ) {
          return false
        }
        if (
          t.url === '/' &&
          url === t.url + this.settings.theme?.toLowerCase?.()
        ) {
          return false
        }
        return t.url !== url
      })

    if (!isLogin) {
      const isShowFace =
        [this.settings.showLanguage, this.settings.showThemeToggle].filter(
          Boolean,
        ).length === 0
      if (isShowFace) {
        this.open = true
        this.isShowFace = false
      }
    }
  }

  onScroll(event: any) {
    const top = event?.target?.scrollTop || scrollY
    this.isShowTop = top > 100
  }

  ngAfterViewInit() {
    const target = this.selector
      ? (document.querySelector(this.selector) as HTMLElement)
      : window

    this.onScroll(target)
    this.scrollSubscription = fromEvent(target, 'scroll')
      .pipe(debounceTime(100))
      .subscribe((event) => this.onScroll(event))
  }

  ngOnDestroy() {
    if (this.scrollSubscription) {
      this.scrollSubscription.unsubscribe()
      this.scrollSubscription = null
    }
  }

  toggleTheme(theme: any) {
    this.router.navigate([theme.url], {
      queryParams: {
        _: Date.now(),
      },
      queryParamsHandling: 'merge',
    })
  }

  goTop() {
    const config: ScrollToOptions = {
      top: 0,
      behavior: 'smooth',
    }
    if (this.selector) {
      const el = document.querySelector(this.selector)
      if (el) {
        el.scrollTo(config)
      }
      return
    }

    window.scrollTo(config)
  }

  collapse() {
    this.onCollapse.emit()
  }

  toggleMode() {
    this.isDark = !this.isDark
    mitt.emit('EVENT_DARK', this.isDark)
    window.localStorage.setItem(
      STORAGE_KEY_MAP.IS_DARK,
      String(Number(this.isDark)),
    )

    if (this.isDark) {
      addDark()
    } else {
      removeDark()
    }
  }

  goSystemPage() {
    this.entering = true
    this.router.navigate(['system'])
  }

  handleOpen() {
    if (!this.isShowFace) {
      return
    }
    this.open = !this.open
    localStorage.setItem(STORAGE_KEY_MAP.FIXBAR_OPEN, String(this.open))
  }

  unregisterServiceWorkers() {
    this.checking = true
    unregisterServiceWorkers()
      .then((status) => {
        if (status) {
          setTimeout(() => {
            location.reload()
          }, 2000)
        } else {
          this.checking = false
        }
      })
      .catch(() => {
        this.checking = false
      })
  }

  handleSync() {
    this.modal.info({
      nzTitle: $t('_syncDataOut'),
      nzOkText: $t('_confirmSync'),
      nzContent: $t('_confirmSyncTip'),
      nzOnOk: async () => {
        await updateFileContent({
          message: 'update db',
          content: JSON.stringify(
            cleanWebAttrs(JSON.parse(JSON.stringify(navs()))),
          ),
          path: DB_PATH,
        })
        this.message.success($t('_syncSuccessTip'))
      },
    })
  }

  toggleLocale() {
    this.handleOpen()
    const l = this.language === 'en' ? 'zh-CN' : 'en'
    localStorage.setItem(STORAGE_KEY_MAP.LANGUAGE, l)
    location.reload()
  }
}
