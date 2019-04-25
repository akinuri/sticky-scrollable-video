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
        
        self.initialize();
        
        self.moveSiblingsUp();
        
        var initialScrollPercent = parseFloat(((scrollY - self.scroll.area[0]) / self.scroll.height).toFixed(6));
        var initialFrameTime     = parseFloat((initialScrollPercent * self.video.element.duration).toFixed(6));
        requestAnimationFrame(function () {
            self.video.element.currentTime = initialFrameTime;
        });
        
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
        
        window.addEventListener("resize", throttle(function() {
            console.log("resize initialize");
            self.initialize();
        }, 250));
        
    });
    
    if (this.video.element.dataset.src) {
        this.video.element.src = this.video.element.dataset.src;
    }
    
}

StickyScrollableVideo.prototype.initialize = function initialize() {
    this.video.height = this.video.element.offsetHeight;
    
    let height = Math.round(this.video.element.duration * this.scroll.pixelsPerSec) + this.video.height;
    this.wrapper.element.style.height  = height + "px";
    this.video.element.style.position = "sticky";
    this.video.element.style.top      = "0";
    
    this.wrapper.height = this.wrapper.element.offsetHeight;
    this.wrapper.top    = this.wrapper.element.getBoundingClientRect().top + scrollY;
    this.wrapper.bottom = this.wrapper.top + this.wrapper.height;
    
    this.scroll.area   = [this.wrapper.top, this.wrapper.top + this.wrapper.height - this.video.height];
    this.scroll.height = this.scroll.area[1] - this.scroll.area[0];
    
    this.siblings.offsetTop   = getAbsRect(this.siblings.elements[0]).top - this.wrapper.bottom;
    this.siblings.totalHeight = 0;
    this.siblings.style.width = [];
    this.siblings.style.left  = [];
    this.siblings.style.top   = [];
    this.siblings.frozen      = false;
    this.siblings.position    = null;
    
    var self = this;
    
    this.siblings.elements.forEach(function (sibling, index) {
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
};


function throttle(callback, delay) {
    var timeoutHandler = null;
    return function () {
        if (timeoutHandler == null) {
            timeoutHandler = setTimeout(function () {
                callback();
                clearInterval(timeoutHandler);
                timeoutHandler = null;
            }, delay);
        }
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
