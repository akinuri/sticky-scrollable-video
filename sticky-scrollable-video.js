function StickyScrollableVideo(vidEl, pixelsPerSec) {
    
    var self = this;
    
    this.video = {
        element : vidEl,
    };
    
    this.parent = {
        // will have a really long height and act as a seekbar
        element : vidEl.parentElement,
    };
    
    // padding-bottom will be added to this element
    // when younger siblings are set to "fixed"
    // so that scroll height of the page doesn't change
    this.contentElement = this.parent.element.parentElement;
    
    this.siblings = {
        elements    : [],
        topOffsets  : [],
        totalHeight : 0,
        frozen      : false,
        position    : null,
    };
    
    this.scroll = {
        pixelsPerSec : pixelsPerSec || 500,
        area         : [],
        height       : 0,
        dir          : 0,
        _prevPercent : null,
    };
    
    this.video.element.addEventListener("loadedmetadata", function() {
        
        let height = Math.round(self.video.element.duration * self.scroll.pixelsPerSec) + self.video.element.offsetHeight;
        self.parent.element.style.height  = height + "px";
        self.video.element.style.position = "sticky";
        self.video.element.style.top      = "0";
        
        self.video.boundingBox = self.video.element.getBoundingClientRect();
        self.video.height      = self.video.element.offsetHeight;
        self.video.top         = self.video.boundingBox.top + scrollY;
        self.video.bottom      = self.video.top + self.video.height;
        
        self.parent.boundingBox = self.parent.element.getBoundingClientRect();
        self.parent.height      = self.parent.element.offsetHeight;
        self.parent.top         = self.parent.boundingBox.top + scrollY;
        self.parent.bottom      = self.parent.top + self.parent.height;
        
        console.log(self.video);
        console.log(self.parent);
        
        self.scroll.area   = [self.video.top, self.video.top + self.parent.height - self.video.height];
        self.scroll.height = self.scroll.area[1] - self.scroll.area[0];
        
        self.siblings.elements = StickyScrollableVideo.getSiblings(self.parent.element);
        self.siblings.elements.forEach(function (sibling, index) {
            self.siblings.totalHeight += sibling.offsetHeight;
            if (index == 0) {
                self.siblings.topOffsets.push(self.video.height);
            } else {
                var prevSiblings = self.siblings.elements.slice(0, index);
                var height = 0;
                prevSiblings.forEach(sib => height += self.video.height + sib.offsetHeight);
                self.siblings.topOffsets.push(height);
            }
        });
        
        self.moveSiblingsUp();
        
        window.addEventListener("scroll", function() {
            var scrollPercent = 0;
            var nextFrameTime = 0;
            
            if (self.scroll.area[0] <= scrollY && scrollY <= self.scroll.area[1]) {
                scrollPercent  = parseFloat(((scrollY - self.scroll.area[0]) / self.scroll.height).toFixed(6));
                if (self.scroll._prevPercent == null) {
                    self.scroll._prevPercent = scrollPercent;
                } else {
                    if (self.scroll._prevPct < scrollPercent) {
                        self.scroll.dir = 1;
                    } else {
                        self.scroll.dir = -1;
                    }
                }
                nextFrameTime = parseFloat((scrollPercent * self.video.element.duration).toFixed(6));
                if (!self.video.playing) {
                    self.video.playing = true;
                }
                console.log(scrollPercent, nextFrameTime);
                requestAnimationFrame(function () {
                    self.video.element.currentTime = nextFrameTime;
                });
            } else {
                if (self.video.playing) {
                    self.video.playing = false;
                }
            }
            
            if (self.video.playing) {
                if (!self.siblings.frozen) {
                    self.freezeSiblings();
                }
            } else {
                if (self.siblings.frozen) {
                    self.unfreezeSiblings();
                }
            }
            
            if (scrollY > self.scroll.area[1]) {
                if (self.siblings.position != "down") {
                    self.moveSiblingsDown();
                }
            }
            
        });
        
    });
    
    // console.log(this);
}

StickyScrollableVideo.getSiblings = function getYoungerSiblings(el) {
    var siblings = [];
    while (el.nextElementSibling) {
        siblings.push(el.nextElementSibling);
        el = el.nextElementSibling;
    }
    return siblings;
};

StickyScrollableVideo.prototype.moveSiblingsUp = function () {
    var self = this;
    this.siblings.elements.forEach(function (sibling) {
        sibling.style.position  = "relative";
        sibling.style.top       = "0";
        sibling.style.transform = "translateY(-" + self.scroll.height + "px)";
    });
    this.siblings.position = "up";
};

StickyScrollableVideo.prototype.moveSiblingsDown = function () {
    var self = this;
    this.siblings.elements.forEach(function (sibling) {
        sibling.style.position  = "relative";
        sibling.style.top       = "0";
        sibling.style.transform = "translateY(0)";
    });
    this.siblings.position = "down";
};

StickyScrollableVideo.prototype.freezeSiblings = function () {
    var self = this;
    this.siblings.elements.forEach(function (sibling, index) {
        sibling.style.position  = "fixed";
        sibling.style.top       = self.siblings.topOffsets[index] + "px";
        sibling.style.transform = "translateY(0)";
    });
    self.siblings.position = null;
    this.contentElement.style.paddingBottom = this.siblings.totalHeight + "px";
    this.siblings.frozen = true;
};

StickyScrollableVideo.prototype.unfreezeSiblings = function () {
    var self = this;
    this.siblings.elements.forEach(function (sibling, index) {
        sibling.style.position  = "relative";
        sibling.style.top       = "0";
        sibling.style.transform = "translateY(-" + self.scroll.height + "px)";
    });
    self.siblings.position = "up";
    this.contentElement.style.paddingBottom = "";
    this.siblings.frozen = false;
};

