// 开源项目，未经作者同意，不得以抄袭/复制代码/修改源代码版权信息。
// Copyright @ 2018-present xiejiahe. All rights reserved.
// See https://github.com/xjh22222228/nav

import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  ViewChildren,
  QueryList,
  SimpleChanges,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import type { INavThreeProp } from 'src/types'
import { scrollIntoViewLeft, queryString } from 'src/utils'
import { fromEvent, Subscription } from 'rxjs'
import { debounceTime } from 'rxjs/operators'

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-class-tabs',
  templateUrl: './index.component.html',
  styleUrls: ['./index.component.scss'],
})
export class ClassTabsComponent {
  @ViewChild('parent') parentElement!: ElementRef
  @ViewChild('anchor') anchorElement!: ElementRef
  @ViewChildren('item') items!: QueryList<ElementRef>
  @Input() data?: INavThreeProp[] = []
  @Input() selector: string = ''

  activeIndex = 0
  private toolbarItems: HTMLElement[] = []
  private scrollSubscription: Subscription | null = null
  private disableScrollEvent = false

  constructor() {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      const { currentValue = [], previousValue = [] } = changes['data']
      const currentIds = currentValue
        .map((item: any) => item.rId || item.id)
        .join(',')
      const previousIds = previousValue
        .map((item: any) => item.rId || item.id)
        .join(',')
      if (currentIds === previousIds) return
      const { id } = queryString(false)
      const idx = this.data?.findIndex((item) => item.id === Number(id)) || -1
      if (idx === -1) {
        this.selectTab(0)
      } else {
        setTimeout(() => {
          this.getToolbarItems()
          this.selectTab(idx)
        }, 100)
      }

      requestAnimationFrame(() => {
        if (idx === -1) {
          this.getToolbarItems()
          this.setAnchorStyle()
        }

        if (this.scrollSubscription) {
          this.scrollSubscription.unsubscribe()
          this.scrollSubscription = null
        }
        const target = this.getTarget()
        this.scrollSubscription = fromEvent(target, 'scroll')
          .pipe(debounceTime(100))
          .subscribe(() => this.handleScroll())
      })
    }
  }

  ngOnDestroy() {
    if (this.scrollSubscription) {
      this.scrollSubscription.unsubscribe()
      this.scrollSubscription = null
    }
  }

  private getTarget() {
    return this.selector
      ? document.querySelector(this.selector) || window
      : window
  }

  private getToolbarItems() {
    this.toolbarItems = Array.from(
      document.querySelectorAll('.nav-wrapper'),
    ) as HTMLElement[]
  }

  private handleScroll() {
    if (this.disableScrollEvent) {
      this.disableScrollEvent = false
      return
    }
    if (this.toolbarItems.length === 0) {
      this.getToolbarItems()
    }
    const target = this.getTarget()
    const scrollY =
      target === window ? window.scrollY : (target as Element).scrollTop
    const scrollPosition =
      scrollY + this.parentElement.nativeElement.offsetHeight

    this.toolbarItems.forEach((item, index) => {
      const itemTop = item.offsetTop
      const itemBottom = itemTop + item.offsetHeight
      if (index === 0) {
        if (scrollPosition < itemTop) {
          this.updateActiveIndex(0)
        }
        return
      }
      if (scrollPosition >= itemTop && scrollPosition < itemBottom) {
        this.updateActiveIndex(index)
      }
    })
  }

  private updateActiveIndex(index: number) {
    if (this.activeIndex === index) return
    this.activeIndex = index
    this.scrollIntoViewTabs()
    this.setAnchorStyle()
  }

  private scrollIntoViewTabs() {
    scrollIntoViewLeft(
      this.parentElement.nativeElement,
      this.items.toArray()[this.activeIndex].nativeElement,
      {
        behavior: 'smooth',
      },
    )
  }

  selectTab(index: number) {
    if (this.activeIndex === index && index <= 0) return

    this.activeIndex = index
    this.scrollIntoViewTabs()
    this.setAnchorStyle()
    this.disableScrollEvent = true
    this.scrollIntoView()
  }

  private setAnchorStyle() {
    const anchorElement = this.anchorElement.nativeElement
    if (!anchorElement) return
    const el = this.items.toArray()[this.activeIndex]?.nativeElement
    if (!el) return
    const width = el.offsetWidth
    const left = el.offsetLeft
    anchorElement.style.width = `${width}px`
    anchorElement.style.left = `${left}px`
  }

  private scrollIntoView() {
    const id = this.data?.[this.activeIndex].id
    if (!id) return
    const el = document.getElementById(`t${id}`)
    if (el) {
      const offfsetTop = el.offsetTop
      const top = offfsetTop - this.parentElement.nativeElement.offsetHeight
      const target = this.getTarget()
      target.scrollTo({
        top,
        behavior: 'smooth',
      })
    }
  }
}
