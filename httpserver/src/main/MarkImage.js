class MarkImage {
  constructor(options) {
    this.el = ''
    this.imageSrc = ''
    this.lockImage = true
    this.showLabel = true
    this.showPix = true
    this.data = []
    this.onLoad = Function
    this.onResult = Function
    this.onResult = Function
    Object.assign(this, options)
    this.dataset = this.data.map((x, i) => ({
      index: i,
      active: false,
      coor: x,
    }))
    this.image = new Image()
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d')
    this.container = this.el instanceof HTMLElement ? this.el : document.querySelector(this.el)
    this.container.appendChild(this.canvas)
    this.WIDTH = this.canvas.width = this.container.clientWidth
    this.HEIGHT = this.canvas.height = this.container.clientHeight
    this.isFitting = true // 适配比例
    this.scaleStep = 0
    this.pressType = 0 // 0,没有事件；1～8控制点拖拽，10，拖动图片；11，平移矩形，12，绘制矩形
    this.originX = 0
    this.originY = 0
    this.hitPoint = { // 背景图中心移动距离
      T: 0,
      L: 0,
      R: 0,
      B: 0
    }
    this.selectedRect = null
    this.ctrlRect = null
    this.setEvent()
    this.image.src = this.imageSrc
  }
  get imageScale() {
    return this.IMAGE_HEIGHT / this.IMAGE_ORIGIN_HEIGHT
  }
  setCursor() {
    if (!this.lockImage) {
      this.container.style.cursor = 'move'
    } else {
      this.container.style.cursor = ''
    }
    const cursorMap = {
      12: 'crosshair',
      11: 'move',
      10: 'grab',
      8: 'w-resize',
      7: 'sw-resize',
      6: 's-resize',
      5: 'se-resize',
      4: 'e-resize',
      3: 'ne-resize',
      2: 'n-resize',
      1: 'nw-resize',
    }
    this.container.style.cursor = cursorMap[this.pressType]
  }
  calcStep(init) {
    if (init) {
      this.scaleStep = 100
      this.setScale(false)
    }
    if (this.IMAGE_WIDTH > this.WIDTH || this.IMAGE_HEIGHT > this.HEIGHT) {
      this.setScale(false)
      this.calcStep()
    }
  }
  calcCtrls(coor) {
    const [x1, y1, x2, y2] = coor
    return [
      [x1, y1],
      [(x2 - x1) / 2 + x1, y1],
      [x2, y1],
      [x2, (y2 - y1) / 2 + y1],
      [x2, y2],
      [(x2 - x1) / 2 + x1, y2],
      [x1, y2],
      [x1, (y2 - y1) / 2 + y1]
    ]
  }
  setAutoLock(cb = Function) {
    this.lockImage = !this.lockImage
    cb(this.lockImage)
    this.setCursor()
  }
  // 设置监听事件
  setEvent() {
    this.image.addEventListener('load', () => {
      this.setCursor()
      this.IMAGE_ORIGIN_WIDTH = this.IMAGE_WIDTH = this.image.width
      this.IMAGE_ORIGIN_HEIGHT = this.IMAGE_HEIGHT = this.image.height
      this.fitting()
      this.onLoad()
    })
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.selectedRect && this.isHitCtrl(e) > -1) {
        // 选择控制点
        let hitIndex = this.isHitCtrl(e)
        this.pressType = hitIndex + 1
        const coor = this.selectedRect.coor.map(x => x * this.imageScale)
        this.hitPoint = {
          L: e.offsetX - coor[0] - this.originX,
          T: e.offsetY - coor[1] - this.originY,
          R: this.originX + coor[2] - e.offsetX,
          B: this.originY + coor[3] - e.offsetY
        }
      } else if (this.lockImage && this.isHitRect(e)) {
        // 选择矩形
        let selectIndex
        this.selectedRect = this.isHitRect(e)
        this.dataset.forEach(val => {
          if (val == this.selectedRect) {
            selectIndex = val.index
            val.active = true
          } else {
            val.active = false
          }
        })
        this.selectedRect.active = true
        this.dataset = this.dataset.filter(x => !x.active)
        this.dataset.push(this.selectedRect)
        this.pressType = 11
        const coor = this.selectedRect.coor.map(x => x * this.imageScale)
        this.hitPoint = {
          L: e.offsetX - coor[0] - this.originX,
          T: e.offsetY - coor[1] - this.originY,
          R: this.originX + coor[2] - e.offsetX,
          B: this.originY + coor[3] - e.offsetY
        }
        this.onSelect(selectIndex, this.selectedRect.coor.map(y => Math.round(y)))
        this.draw()
      } else if (this.lockImage && !this.isHitRect(e) && this.isHitImage(e)) {
        // 开始绘制
        this.pressType = 12
        this.dataset.forEach(val => {
          val.active = false
        })
        let x1 = (e.offsetX - this.originX) / this.imageScale
        let y1 = (e.offsetY - this.originY) / this.imageScale
        this.dataset.push({
          index: this.dataset.length,
          active: true,
          coor: [x1, y1, x1, y1]
        })
        this.selectedRect = this.dataset.find(x => x.active)
        this.draw()
      } else if (!this.lockImage && this.isHitImage(e)) {
        // 移动图片
        this.pressType = 10
        this.hitPoint = {
          T: e.offsetY - this.originY,
          L: e.offsetX - this.originX,
        }
      }
    })
    this.canvas.addEventListener('mousemove', (e) => {
      if (e.buttons !== 1) return
      if (this.pressType == 11) {
        // 移动框选区域
        let x1 = e.offsetX - this.originX - this.hitPoint.L
        let y1 = e.offsetY - this.originY - this.hitPoint.T
        let x2 = e.offsetX + this.hitPoint.R - this.originX
        let y2 = e.offsetY + this.hitPoint.B - this.originY
        if (x1 >= 0 && x2 <= this.IMAGE_WIDTH && y1 >= 0 && y2 <= this.IMAGE_HEIGHT) {
          this.selectedRect.coor = [x1 / this.imageScale, y1 / this.imageScale, x2 / this.imageScale, y2 / this.imageScale]
        }
      } else if (this.pressType == 10) {
        // 移动背景图
        this.originX = e.offsetX - this.hitPoint.L
        this.originY = e.offsetY - this.hitPoint.T
      } else if (this.pressType > 0 && this.pressType < 9) {
        // 移动控制点1
        let coor = this.selectedRect.coor
        let [X1, Y1, X2, Y2] = coor.map(x => x * this.imageScale) // 选中矩形的视图坐标
        let x1 = e.offsetX - this.originX - this.hitPoint.L // 相对origin原点坐标
        let y1 = e.offsetY - this.originY - this.hitPoint.T // 相对origin原点坐标
        let x2 = e.offsetX + this.hitPoint.R - this.originX // 相对origin原点坐标
        let y2 = e.offsetY + this.hitPoint.B - this.originY // 相对origin原点坐标

        if (this.pressType == 1 && x1 >= 0 && x1 < X2 && y1 >= 0 && y1 < Y2) {
          this.selectedRect.coor = [x1 / this.imageScale, y1 / this.imageScale, coor[2], coor[3]]
        } else if (this.pressType == 2 && y1 >= 0 && y1 < Y2) {
          this.selectedRect.coor = [coor[0], y1 / this.imageScale, coor[2], coor[3]]
        } else if (this.pressType == 3 && x2 > X1 && x2 <= this.IMAGE_WIDTH && y1 >= 0 && y1 < Y2) {
          this.selectedRect.coor = [coor[0], y1 / this.imageScale, x2 / this.imageScale, coor[3]]
        } else if (this.pressType == 4 && x2 > X1 && x2 <= this.IMAGE_WIDTH) {
          this.selectedRect.coor = [coor[0], coor[1], x2 / this.imageScale, coor[3]]
        } else if (this.pressType == 5 && x2 > X1 && y2 > Y1 && x2 <= this.IMAGE_WIDTH && y2 <= this.IMAGE_HEIGHT) {
          this.selectedRect.coor = [coor[0], coor[1], x2 / this.imageScale, y2 / this.imageScale]
        } else if (this.pressType == 6 && y2 > Y1 && y2 <= this.IMAGE_HEIGHT) {
          this.selectedRect.coor = [coor[0], coor[1], coor[2], y2 / this.imageScale]
        } else if (this.pressType == 7 && x1 >= 0 && x1 < X2 && y2 > Y1 && y2 <= this.IMAGE_HEIGHT) {
          this.selectedRect.coor = [x1 / this.imageScale, coor[1], coor[2], y2 / this.imageScale]
        } else if (this.pressType == 8 && x1 >= 0 && x1 < X2) {
          this.selectedRect.coor = [x1 / this.imageScale, coor[1], coor[2], coor[3]]
        }
      } else if (this.pressType == 12) {
        if (e.offsetY > this.originY + this.IMAGE_HEIGHT || e.offsetY < this.originY) return
        if (e.offsetX > this.originX + this.IMAGE_WIDTH || e.offsetX < this.originX) return
        this.selectedRect.coor[2] = (e.offsetX - this.originX) / this.imageScale
        this.selectedRect.coor[3] = (e.offsetY - this.originY) / this.imageScale
      }
      this.draw()
    })
    this.canvas.addEventListener('mouseup', (e) => {
      if (this.pressType == 12) {
        this.dataset.forEach(val => {
          const [x1, y1, x2, y2] = val.coor
          val.coor = [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)]
        })
        const list = this.dataset.map(x => x.coor.map(y => Math.round(y)))
        this.data = list
        this.onResult(list)
      }
      this.pressType = 0
      this.draw()
    })
  }
  // 绘制控制点
  paintCtrls(coor) {
    const list = coor.map(x => x * this.imageScale)
    const ctrls = this.calcCtrls(list)
    this.ctx.fillStyle = '#fff';
    this.ctx.strokeStyle = '#f00';
    for (let n = 0; n < ctrls.length; n++) {
      const dot = ctrls[n];
      this.ctx.beginPath();
      this.ctx.arc(dot[0], dot[1], 3, 0, Math.PI * 2, true)
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(dot[0], dot[1], 3, 0, Math.PI * 2, true)
      this.ctx.stroke();
    }
  }
  // 绘制矩形列表
  paintRectList() {
    const {
      ctx,
      dataset,
      originX,
      originY
    } = this
    for (let i = 0; i < dataset.length; i++) {
      const coor = dataset[i].coor.map(x => x * this.imageScale);
      ctx.save()
      ctx.translate(originX, originY);
      ctx.fillStyle = "rgba(0,0,0,0.2)"
      ctx.fillRect(coor[0], coor[1], (coor[2] - coor[0]), (coor[3] - coor[1]));
      ctx.strokeStyle = "steelblue"
      ctx.strokeRect(coor[0], coor[1], (coor[2] - coor[0]), (coor[3] - coor[1]));
      if (this.showLabel && (this.pressType != 12 || (this.pressType == 12 && i != (dataset.length - 1)))) {
        ctx.save()
        ctx.translate(coor[0], coor[1]);
        ctx.fillStyle = "#fff"
        ctx.fillRect(0, 0, 30, 15)
        ctx.strokeStyle = "#f00"
        ctx.strokeRect(0, 0, 30, 15)
        ctx.fillStyle = '#f00'
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'algin'
        ctx.fillText(dataset[i].index, 13, 8)
        ctx.restore();
      }
      if (dataset[i].active) {
        // 绘制控制点
        this.paintCtrls(dataset[i].coor)
        if (this.showPix) {
          ctx.save()
          let x1 = Math.min(coor[0], coor[2])
          let y1 = Math.min(coor[1], coor[3])
          ctx.translate(x1, y1);
          let [a1, b1, a2, b2] = dataset[i].coor
          let txt = `${Math.round(Math.abs(a2-a1))}*${Math.round(Math.abs(b2-b1))}`
          ctx.fillStyle = "rgba(0,0,0,0.5)"
          ctx.fillRect(0, y1 + this.originY > 24 ? -24 : 0, ctx.measureText(txt).width + 4, 20)
          ctx.fillStyle = '#fff'
          ctx.textBaseline = 'middle'
          ctx.textAlign = 'algin'
          ctx.fillText(txt, 2, y1 + this.originY > 24 ? -15 : 10)
          ctx.restore()
        }
      }
      ctx.restore();
    }
  }
  // 绘制图片
  paintImage() {
    this.ctx.drawImage(this.image, this.originX, this.originY, this.IMAGE_WIDTH, this.IMAGE_HEIGHT)
  }
  draw() {
    this.clear()
    this.paintImage()
    this.paintRectList()
    this.setCursor()
  }
  // 检测点击区域
  onArea(target, area) {
    let {
      offsetX,
      offsetY
    } = target
    let x1 = Math.min(area[0], area[2])
    let x2 = Math.max(area[0], area[2])
    let y1 = Math.min(area[1], area[3])
    let y2 = Math.max(area[1], area[3])
    return (offsetX > x1 && offsetX < x2 && offsetY > y1 && offsetY < y2)
  }
  isHitRect(e) {
    return this.dataset.reverse().find(m => {
      const item = m.coor.map(x => x * this.imageScale)
      const isHit = this.onArea(e, [
        item[0] + this.originX,
        item[1] + this.originY,
        item[2] + this.originX,
        item[3] + this.originY
      ])
      return isHit
    })
  }
  isHitImage(e) {
    // 点击背景图
    return this.onArea(e, [
      this.originX,
      this.originY,
      this.originX + this.IMAGE_WIDTH,
      this.originY + this.IMAGE_HEIGHT
    ])
  }
  isHitCtrl(e) {
    let [x1, y1, x2, y2] = this.selectedRect.coor.map(x => x * this.imageScale)
    let ctrls = this.calcCtrls([x1, y1, x2, y2])
    let r = 3
    let index = -1
    for (let a = 0; a < ctrls.length; a++) {
      const k = ctrls[a];
      const item = [
        k[0] - r, k[1] - r,
        k[0] + r, k[1] + r
      ]
      let isHit = this.onArea(e, [
        item[0] + this.originX,
        item[1] + this.originY,
        item[2] + this.originX,
        item[3] + this.originY
      ])
      if (isHit) {
        index = a;
        break
      }
    }
    return index
  }
  fitZoom() {
    if (this.IMAGE_HEIGHT / this.IMAGE_WIDTH >= this.HEIGHT / this.WIDTH) {
      this.IMAGE_WIDTH = this.IMAGE_ORIGIN_WIDTH / (this.IMAGE_ORIGIN_HEIGHT / this.HEIGHT)
      this.IMAGE_HEIGHT = this.HEIGHT
    } else {
      this.IMAGE_WIDTH = this.WIDTH
      this.IMAGE_HEIGHT = this.IMAGE_ORIGIN_HEIGHT / (this.IMAGE_ORIGIN_WIDTH / this.WIDTH)
    }
  }

  fitting() {
    this.clear()
    this.fitZoom()
    this.center()
    this.paintImage()
    this.paintRectList()
    this.isFitting = true
  }
  setScale(type) {
    type ? this.scaleStep++ : this.scaleStep--
    const abs = Math.abs(this.scaleStep)
    this.IMAGE_WIDTH = this.IMAGE_ORIGIN_WIDTH * Math.pow(this.scaleStep >= 0 ? 1.05 : 0.95, abs)
    this.IMAGE_HEIGHT = this.IMAGE_ORIGIN_HEIGHT * Math.pow(this.scaleStep >= 0 ? 1.05 : 0.95, abs)
  }
  center() {
    this.originX = (this.WIDTH - this.IMAGE_WIDTH) / 2
    this.originY = (this.HEIGHT - this.IMAGE_HEIGHT) / 2
  }
  stayPosition(scale) {
    this.originX = this.WIDTH / 2 - (this.WIDTH / 2 - this.originX) * scale
    this.originY = this.HEIGHT / 2 - (this.HEIGHT / 2 - this.originY) * scale
  }
  clear() {
    this.ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT)
  }
  zoomIn() {
    let width = this.IMAGE_WIDTH
    if (this.isFitting) {
      this.calcStep(true)
      this.isFitting = false // 适配比例
    }
    this.clear()
    this.setScale(true)
    this.stayPosition(this.IMAGE_WIDTH / width)
    this.paintImage()
    this.paintRectList()
  }
  zoomOut() {
    let width = this.IMAGE_WIDTH
    if (this.isFitting) {
      this.calcStep(true)
      this.isFitting = false // 适配比例
    }
    this.clear()
    this.setScale(false)
    this.stayPosition(this.IMAGE_WIDTH / width)
    this.paintImage()
    this.paintRectList()
  }
  remove(index) {
    let num = parseInt(index)
    if (num < 0 || num > this.dataset.length - 1) return
    this.dataset.forEach(val => {
      if (val.index > num) val.index--
    })
    this.dataset.splice(num, 1)
    this.draw()
    const list = this.dataset.map(x => x.coor.map(y => Math.round(y)))
    this.data = list
    this.onResult(list)
  }
}
