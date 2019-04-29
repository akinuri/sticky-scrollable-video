/* ==================== HELPER FUNCTIONS ==================== */

// https://stackoverflow.com/a/1480137/2202732
function getAbsRect(element) {
    var rect = {top : 0, left : 0, width: element.offsetWidth};
    do {
        rect.top  += element.offsetTop  || 0;
        rect.left += element.offsetLeft || 0;
        let marginLeft = parseInt(getComputedStyle(element).marginLeft); // e.g. margin-left: -15px (.vc_row on wordpress)
        if (marginLeft < 0) rect.left += Math.abs(marginLeft);
        element = element.offsetParent;
    } while(element);
    return rect;
};

function throttle(callback, delay) {
    var timeoutHandler = null;
    return function () {
        var self = this;
        if (timeoutHandler == null) {
            timeoutHandler = setTimeout(function () {
                callback.call(self);
                clearInterval(timeoutHandler);
                timeoutHandler = null;
            }, delay);
        }
    }
}


/* ==================== StickyScrollableVideo ==================== */

function StickyScrollableVideo(options) {
    
    var options = options || {}; // {video, hasWrapper, grandParent, siblings, pixelsPerSec, afterWidth}
    
    this.video = {
        element         : options.video,
        loadedmetadata  : null,
        playing         : false,
    };
    
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
        elements    : options.siblings,
        offsetTop   : 0,
        totalHeight : 0,
        frozen      : false,
        position    : "bottom", // top = translateY(-Y)
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
        afterWidth   : options.afterWidth || 0,
        disabled     : true,
    };
    
    this.events = {
        handlers : {
            scroll : StickyScrollableVideo.events.handlers.scroll.bind(this),
            resize : StickyScrollableVideo.events.handlers.resize.bind(this),
        },
    };
    
    var self = this;
    
    this.video.element.addEventListener("loadedmetadata", function() {
        
        self.video.loadedmetadata = true;
            
        if (self.video.element.dataset.src) {
            self.video.element.removeAttribute("data-src");
        }
        
        if (innerWidth >= self.scroll.afterWidth) {
            
            self.initialize();
            
            if (scrollY <= self.wrapper.top) {
                if (self.siblings.state != "shifted") {
                    self.shiftSiblingsUp();
                }
            }
            else if (self.wrapper.top < scrollY && scrollY <= self.wrapper.bottom - self.video.height) {
                if (self.siblings.state != "frozen") {
                    self.freezeSiblings();
                }
            }
            else {
                if (self.siblings.state != "default") {
                    self.releaseSiblings();
                }
                self.video.element.currentTime = self.video.element.duration;
            }
            
            self.scroll.disabled = false;
            
            window.addEventListener("scroll", self.events.handlers.scroll);
        }
        
        window.addEventListener("resize", self.events.handlers.resize);
        
    });
    
    if (this.video.element.dataset.src) {
        this.video.element.src = this.video.element.dataset.src;
    }
    
}


/* ==================== STATIC METHODS/PROPERTIES ==================== */

StickyScrollableVideo.events = {
    handlers : {
        resize : throttle(function() {
            var self = this;
            if (innerWidth >= self.scroll.afterWidth) {
                self.disable();
                // if (self.scroll.disabled) {
                    self.initialize();
                    if (scrollY <= self.wrapper.top) {
                        if (self.siblings.state != "shifted") {
                            self.shiftSiblingsUp();
                        }
                    }
                    else if (self.wrapper.top < scrollY && scrollY <= self.wrapper.bottom - self.video.height) {
                        if (self.siblings.state != "frozen") {
                            self.freezeSiblings();
                        }
                    }
                    else {
                        if (self.siblings.state != "default") {
                            self.releaseSiblings();
                        }
                        self.video.element.currentTime = self.video.element.duration;
                    }
                    window.addEventListener("scroll", self.events.handlers.scroll);
                    self.gotoCurrentFrame();
                // } else {
                    // self.disable();
                // }
            } else {
                if (!self.disabled) {
                    self.disable();
                }
            }
        }, 250),
        scroll : function handleScrollEvent() {
            var self = this;
            if (scrollY <= self.wrapper.top) {
                if (self.siblings.state != "shifted") {
                    self.shiftSiblingsUp();
                }
                if (self.video.playing) {
                    self.video.playing = false;
                }
            }
            else if (self.wrapper.top < scrollY && scrollY <= self.wrapper.bottom - self.video.height) {
                if (self.siblings.state != "frozen") {
                    self.freezeSiblings();
                }
                self.gotoCurrentFrame();
                if (!self.video.playing) {
                    self.video.playing = true;
                }
            }
            else {
                if (self.siblings.state != "default") {
                    self.releaseSiblings();
                }
                self.video.element.currentTime = self.video.element.duration;
                if (self.video.playing) {
                    self.video.playing = false;
                }
            }
        },
    },
};


StickyScrollableVideo.getSiblings = function getYoungerSiblings(el) {
    var siblings = [];
    while (el.nextElementSibling) {
        siblings.push(el.nextElementSibling);
        el = el.nextElementSibling;
    }
    return siblings;
};



/* ==================== PROTOTYPE ==================== */

StickyScrollableVideo.prototype.initialize = function initialize() {
    
    this.video.element.style.position = "sticky";
    this.video.element.style.top      = "0";
    this.video.height                 = this.video.element.offsetHeight;
    
    this.wrapper.element.style.height = Math.round(this.video.element.duration * this.scroll.pixelsPerSec) + this.video.height + "px";
    this.wrapper.height               = this.wrapper.element.offsetHeight;
    this.wrapper.top                  = this.wrapper.element.getBoundingClientRect().top + scrollY;
    this.wrapper.bottom               = this.wrapper.top + this.wrapper.height;
    
    this.scroll.area     = [this.wrapper.top, this.wrapper.top + this.wrapper.height - this.video.height];
    this.scroll.height   = this.scroll.area[1] - this.scroll.area[0];
    this.scroll.disabled = false;
    
    this.siblings.offsetTop   = getAbsRect(this.siblings.elements[0]).top - this.wrapper.bottom;
    this.siblings.totalHeight = 0;
    this.siblings.frozen      = false;
    this.siblings.state    = null;
    this.siblings.style.width = [];
    this.siblings.style.left  = [];
    this.siblings.style.top   = [];
    
    var self = this;
    
    this.siblings.elements.forEach(function (sibling, index) {
        self.siblings.totalHeight += sibling.offsetHeight;
        self.siblings.style.width.push(sibling.offsetWidth);
        self.siblings.style.left.push(getAbsRect(sibling).left);
        if (index == 0) {
            self.siblings.style.top.push(self.video.height);
        } else {
            self.siblings.style.top.push( self.siblings.style.top[self.siblings.style.top.length - 1] + sibling.offsetHeight);
        }
    });
};


StickyScrollableVideo.prototype.gotoCurrentFrame = function () {
    var self = this;
    var scrollPercent = parseFloat(((scrollY - self.scroll.area[0]) / self.scroll.height).toFixed(6));
    var nextFrameTime = parseFloat((scrollPercent * self.video.element.duration).toFixed(6));
    requestAnimationFrame(function () {
        self.video.element.currentTime = nextFrameTime;
    });
};


StickyScrollableVideo.prototype.shiftSiblingsUp = function () {
    var self = this;
    this.siblings.elements.forEach(function (sibling) {
        sibling.style.transform = "translateY(-" + self.scroll.height + "px)";
        // disable freeze
        sibling.style.position  = "";
        sibling.style.top       = "";
        sibling.style.left      = "";
        sibling.style.width     = "";
    });
    this.siblings.state = "shifted";
    // disable padding (scroll fix)
    this.grandParent.style.paddingBottom = "";
};


StickyScrollableVideo.prototype.disable = function disableScroll() {
    
    this.video.height  = this.video.element.offsetHeight;
    this.video.playing = false;
    
    this.video.element.style.position = "";
    
    this.wrapper.height = null;
    this.wrapper.top    = null;
    this.wrapper.bottom = null;
    
    this.wrapper.element.style.height = "";
    
    this.grandParent.style.paddingBottom = "";
    
    this.siblings.totalHeight = null;
    this.siblings.style.left  = [];
    this.siblings.style.top   = [];
    this.siblings.style.width = [];
    this.siblings.state       = "default";
    
    this.scroll.disabled = true;
    this.scroll.area     = [];
    this.scroll.height   = null;
    
    var self = this;
    
    this.siblings.elements.forEach(function (sibling, index) {
        sibling.style.position = "";
        sibling.style.top = "";
        sibling.style.left = "";
        sibling.style.width = "";
        sibling.style.transform = "";
    });
    
    this.releaseSiblings();
    
    window.removeEventListener("scroll", this.events.handlers.scroll);
};


StickyScrollableVideo.prototype.freezeSiblings = function () {
    var self = this;
    this.siblings.elements.forEach(function (sibling, index) {
        sibling.style.position  = "fixed";
        sibling.style.top       = self.siblings.style.top[index] + self.siblings.offsetTop + "px";
        sibling.style.left      = self.siblings.style.left[index] + "px";
        sibling.style.width     = self.siblings.style.width[index] + "px";
        // disable shift
        sibling.style.transform = "";
    });
    this.grandParent.style.paddingBottom = this.siblings.totalHeight + "px";
    this.siblings.state = "frozen";
};


StickyScrollableVideo.prototype.releaseSiblings = function () {
    var self = this;
    this.siblings.elements.forEach(function (sibling, index) {
        // disable freeze
        sibling.style.position  = "";
        sibling.style.top       = "";
        sibling.style.left      = "";
        sibling.style.width     = "";
        // disable shift
        sibling.style.transform = "";
    });
    this.grandParent.style.paddingBottom = "";
    this.siblings.state = "default";
};
