// https://stackoverflow.com/a/1480137/2202732
function getAbsRect(element) {
    var rect = {top : 0, left : 0, width: element.offsetWidth};
    do {
        rect.top  += element.offsetTop  || 0;
        rect.left += element.offsetLeft || 0;
        let marginLeft = parseInt(getComputedStyle(element).marginLeft);
        if (marginLeft < 0) rect.left += Math.abs(marginLeft);
        element = element.offsetParent;
    } while(element);
    return rect;
};


function StickyScrollableVideo(options) {
    
    var options = options || {
        // video        : null,
        // hasWrapper   : null,
        // grandParent  : null,
        // siblings     : null,
        // pixelsPerSec : null,
    };
    
    this.video = { element : options.video };
    
    // wrapper will have a really long height and act as a seekbar
    this.wrapper = {};
    
    if (options.hasWrapper) {
        this.wrapper.element = this.video.element.parentElement;
    } else {
        this.wrapper.element = document.createElement("div");
        this.video.element.parentElement.insertBefore(this.wrapper.element, this.video.element);
        this.wrapper.element.appendChild(this.video.element);
    }
    
    // parent that contains video, video parent/wrapper, and siblings
    // padding-bottom will be added to this element when siblings are set to "fixed"
    // so that scroll height of the page doesn't change
    this.grandParent = options.grandParent;
    
    this.siblings = {
        offsetTop   : 0,
        elements    : options.siblings,
        totalHeight : 0,
        frozen      : false,
        position    : null,
        style      : {
            width : [],
            top   : [],
            left  : [],
        },
    };
    
    this.scroll = {
        pixelsPerSec : options.pixelsPerSec || 250,
        area         : [],
        height       : 0,
    };
    
    var self = this;
    
    this.video.element.addEventListener("loadedmetadata", function() {
        
        if (self.video.element.dataset.src) {
            self.video.element.removeAttribute("data-src");
        }
        
        self.video.height = self.video.element.offsetHeight;
        
        let height = Math.round(self.video.element.duration * self.scroll.pixelsPerSec) + self.video.height;
        self.wrapper.element.style.height  = height + "px";
        self.video.element.style.position = "sticky";
        self.video.element.style.top      = "0";
        
        self.wrapper.height = self.wrapper.element.offsetHeight;
        self.wrapper.top    = self.wrapper.element.getBoundingClientRect().top + scrollY;
        self.wrapper.bottom = self.wrapper.top + self.wrapper.height;
        
        self.scroll.area   = [self.wrapper.top, self.wrapper.top + self.wrapper.height - self.video.height];
        self.scroll.height = self.scroll.area[1] - self.scroll.area[0];
        
        self.siblings.offsetTop = getAbsRect(self.siblings.elements[0]).top - self.wrapper.bottom;
        
        self.siblings.elements.forEach(function (sibling, index) {
            self.siblings.totalHeight += sibling.offsetHeight;
            self.siblings.style.width.push(sibling.offsetWidth);
            self.siblings.style.left.push(getAbsRect(sibling).left);
            if (index == 0) {
                self.siblings.style.top.push(self.video.height);
            } else {
                var prevSiblings = self.siblings.elements.slice(0, index);
                var height = 0;
                prevSiblings.forEach(sib => height += self.video.height + sib.offsetHeight);
                self.siblings.style.top.push(height);
            }
        });
        
        self.moveSiblingsUp();
        
        window.addEventListener("scroll", function() {
            var scrollPercent = 0;
            var nextFrameTime = 0;
            
            if (self.scroll.area[0] <= scrollY && scrollY <= self.scroll.area[1]) {
                scrollPercent  = parseFloat(((scrollY - self.scroll.area[0]) / self.scroll.height).toFixed(6));
                nextFrameTime = parseFloat((scrollPercent * self.video.element.duration).toFixed(6));
                if (!self.video.playing) {
                    self.video.playing = true;
                }
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
        
        var initialScrollPercent = parseFloat(((scrollY - self.scroll.area[0]) / self.scroll.height).toFixed(6));
        var initialFrameTime     = parseFloat((initialScrollPercent * self.video.element.duration).toFixed(6));
        requestAnimationFrame(function () {
            self.video.element.currentTime = initialFrameTime;
        });
        
    });
    
    if (this.video.element.dataset.src) {
        this.video.element.src = this.video.element.dataset.src;
    }
    
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
        sibling.style.top       = self.siblings.style.top[index] + self.siblings.offsetTop + "px";
        sibling.style.left      = self.siblings.style.left[index] + "px";
        sibling.style.width     = self.siblings.style.width[index] + "px";
        sibling.style.transform = "translateY(0)";
    });
    this.siblings.position = null;
    this.grandParent.style.paddingBottom = this.siblings.totalHeight + "px";
    this.siblings.frozen = true;
};

StickyScrollableVideo.prototype.unfreezeSiblings = function () {
    var self = this;
    this.siblings.elements.forEach(function (sibling, index) {
        sibling.style.position  = "relative";
        sibling.style.top       = "0";
        sibling.style.left      = "0";
        sibling.style.width     = "";
        sibling.style.transform = "translateY(-" + self.scroll.height + "px)";
    });
    this.siblings.position = "up";
    this.grandParent.style.paddingBottom = "";
    this.siblings.frozen = false;
};
