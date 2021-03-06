/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	const $ = __webpack_require__(1);
	const Htmlanno = __webpack_require__(2);
	window.$ = $;
	
	$(()=>{
	  console.log("hello");
	  htmlanno = new Htmlanno();
	  window.htmlanno = htmlanno;
	});


/***/ }),
/* 1 */
/***/ (function(module, exports) {

	module.exports = jQuery;

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

	const $ = __webpack_require__(1);
	
	const EventManager = __webpack_require__(3);
	const AnnotationContainer = __webpack_require__(5);
	
	window.globalEvent = new EventManager();
	window.annotationContainer = new AnnotationContainer();
	
	const AnnoUI = __webpack_require__(6);
	
	const TomlTool = __webpack_require__(7);
	const Highlighter = __webpack_require__(16);
	const Circle = __webpack_require__(12);
	const ArrowConnector = __webpack_require__(22);
	const FileContainer = __webpack_require__(23);
	const Highlight = __webpack_require__(11);
	const RelationAnnotation = __webpack_require__(14);
	const Bioes = __webpack_require__(24);
	const LoadBioesPromise = __webpack_require__(25);
	const LoadHtmlPromise = __webpack_require__(26);
	const LoadTextPromise = __webpack_require__(28);
	const HideBioesAnnotation = __webpack_require__(27);
	const WindowEvent = __webpack_require__(21);
	
	class Htmlanno{
	  constructor(){
	    this.defaultDataUri = './sample/sample.xhtml';
	    this.defaultDataName = this.excludeBaseUriName(this.defaultDataUri); // これは固定値だが指示都合上定数にしてはならない
	    this._currentContentFileName = undefined;
	    /**
	     * @see #reloadContent
	     * @see #loadDefaultData
	     */
	    this.useDefaultData = true;
	    this.setupHtml();
	    this.highlighter = new Highlighter(annotationContainer);
	    this.arrowConnector = new ArrowConnector(annotationContainer);
	
	    // The contents and annotations from files.
	    this.fileContainer = new FileContainer();
	
	    globalEvent.on(this, "resizewindow", this.handleResize.bind(this));
	    globalEvent.on(this, "mouseup", this.handleMouseUp.bind(this));
	
	    globalEvent.on(this, "removearrowannotation", (data)=>{
	      this.arrowConnector.removeAnnotation(data);
	      this.unselectRelation();
	    });
	    this.wrapGlobalEvents();
	    this.loadDefaultData();
	  }
	
	  storageKey(){
	    return "htmlanno-save-"+document.location.href;
	  }
	
	  setupHtml(){
	    const html = `
	      <div id="htmlanno-annotation">
	      <link rel="stylesheet" href="index.css">
	      <svg id="htmlanno-svg-screen"
	      visibility="hidden"
	      baseProfile="full"
	      pointer-events="visible"
	      width="100%"
	      height="100%" style="z-index: 100;">
	      <defs>
	      <marker id="htmlanno-arrow-head"
	      class="htmlanno-arrow-head"
	      visibility="visible"
	      refX="6"
	      refY="3"
	      fill="red"
	      markerWidth="6"
	      markerHeight="6"
	      orient="auto-start-reverse"
	      markerUnits="strokeWidth">
	      <polyline
	      points="0,0 6,3 0,6 0.2,3" />
	      </marker>
	      </defs>
	      </svg>
	      <span id="ruler" style="visibility:hidden;position:absolute;white-space:nowrap;"></span>
	      </div>
	      `;
	
	    $(html).appendTo("#viewerWrapper");
	  }
	
	  wrapGlobalEvents(){
	    AnnoUI.util.setupResizableColumns();
	    AnnoUI.event.setup();
	
	    AnnoUI.browseButton.setup({
	      loadFiles :                          this.loadFiles.bind(this),
	      clearAllAnnotations :                this.remove.bind(this),
	      displayCurrentReferenceAnnotations : this.displayReferenceAnnotation.bind(this),
	      displayCurrentPrimaryAnnotations :   () => {}, // not use. @see restoreAnnotations()
	      getContentFiles :                    this.getContentFiles.bind(this),
	      getAnnoFiles :                       this.getAnnoFiles.bind(this),
	      closePDFViewer :                     this.clearViewer.bind(this),
	      callbackLoadedFiles :                this.restoreAnnotations.bind(this)
	    });
	
	    AnnoUI.contentDropdown.setup({
	      initialText: 'Content File',
	      overrideWarningMessage: 'Are you sure to load another Content ?',
	      contentReloadHandler: this.reloadContent.bind(this)
	    });
	
	    AnnoUI.primaryAnnoDropdown.setup({
	      clearPrimaryAnnotations: this.clearPrimaryAnnotation.bind(this),
	      displayPrimaryAnnotation: this.displayPrimaryAnnotation.bind(this)
	    });
	
	    AnnoUI.referenceAnnoDropdown.setup({
	      displayReferenceAnnotations: this.displayReferenceAnnotation.bind(this)
	    });
	
	    AnnoUI.labelInput.setup({
	      getSelectedAnnotations: this.getSelectedAnnotations.bind(this),
	      saveAnnotationText: this.endEditLabel.bind(this),
	      createSpanAnnotation: this.handleAddSpan.bind(this),
	      createRelAnnotation: this.handleAddRelation.bind(this)
	    });
	
	    AnnoUI.downloadButton.setup({
	      getAnnotationTOMLString: this.handleExportAnnotation.bind(this),
	      getCurrentContentName: ()=> {
	         if (undefined == this.currentContentFileName) {
	           WindowEvent.emit(
	             'open-alert-dialog',
	             {message: 'Cannot determine the filename for download.'}
	           );
	           return undefined;
	         }
	         else {
	           return this.currentContentFileName.replace(/(\.[^.]+)?$/, '.htmlanno');
	         }
	      }
	    });
	
	    AnnoUI.annoListDropdown.setup({
	      getAnnotations: annotationContainer.getAllAnnotations.bind(annotationContainer),
	      scrollToAnnotation: this.scrollToAnnotation.bind(this)
	    });
	
	    $(document).on("keydown", this.handleKeydown.bind(this));
	    $("#viewer").on("mouseup", this.handleMouseUp.bind(this));
	
	    let windowObj = $(window);
	    windowObj.on("resize", (e)=>{
	      globalEvent.emit("resizewindow", e);
	    });
	
	    windowObj.on("mousedown", this.handleMouseDown.bind(this));
	
	    window.addEventListener('open-alert-dialog', (e) => {
	      AnnoUI.ui.alertDialog.show(e.detail);
	    });
	
	    $('#tools').on('resizestop', (e) => {
	      globalEvent.emit("resizewindow", e);
	    });
	
	    $('#adjust_css > li').each((index, elm) => {
	      let style_name = elm.getAttribute('data-style');
	      let default_value = parseInt($('#viewer').css(style_name));
	      $(elm).find('input:text').val(default_value);
	      $(elm).find('input:text')[0].setAttribute('data-default-value', default_value);
	
	      this.handleAdjustCss(elm);
	    });
	    $('#adjust_css_reset').on('click', (event) => {
	      $('#adjust_css input:text').each((index, form) => {
	        form.value = form.getAttribute('data-default-value');
	        $(form).change();
	      });
	    });
	  }
	
	  handleAdjustCss(adjuster) {
	    let style_name = adjuster.getAttribute('data-style');
	    let adjusterObj = $(adjuster);
	    let form = adjusterObj.find('input:text');
	
	    form.on('change', (event) => {
	      $('#viewer').css(style_name, form.val() + 'px');
	      this.handleResize();
	    });
	    adjusterObj.find('.btn.increment').on('click', (event) => {
	      form.val(parseInt(form.val()) + 1);
	      form.change();
	    });
	    adjusterObj.find('.btn.decrement').on('click', (event) => {
	      form.val(parseInt(form.val()) - 1);
	      form.change();
	    });
	  }
	
	  handleResize(){
	    let viewWrapper = $('#viewerWrapper');
	    // 10 is #viewrWrapper's margin(top: 5px, bottom: 5px)
	    let height = $(window).height() - viewWrapper[0].offsetTop - 10;
	    viewWrapper.css('height', '');
	    viewWrapper.css('max-height', `${height}px`);
	    $('#htmlanno-svg-screen').css('height', `${$('#viewer').height()}px`);
	
	    if (Circle.instances){
	      Circle.instances.forEach((cir)=>{
	        cir.resetPosition();
	      });
	      Circle.instances.forEach((cir)=>{
	        cir.reposition();
	      });
	    }
	    annotationContainer.forEach((annotation) => {
	      if (annotation instanceof RelationAnnotation) {
	        annotation.reposition();
	      }
	    });
	  }
	
	  // HtmlAnno only, NEED.
	  handleKeydown(e){
	    let selected = this.getSelectedAnnotations();
	    if (0 != selected.length) {
	      let lastSelected = selected.sort(
	        (a, b) => { return a - b; }
	      ).pop();
	
	      // delete or back space
	      if (e.keyCode === 46 || e.keyCode == 8) {
	        if (document.body == e.target){
	          e.preventDefault();
	          lastSelected.remove();
	          annotationContainer.remove(lastSelected);
	          let uuid = lastSelected.uuid; // lastSelected.uuid(getter) is accessed after deleted it maybe.
	          WindowEvent.emit('annotationDeleted', {detail: {uuid: uuid} });
	        }
	      // esc
	      } else if (e.keyCode === 27) {
	        if (lastSelected instanceof Highlight) {
	          this.unselectHighlight(lastSelected);
	        } else if (lastSelected instanceof RelationAnnotation) {
	          this.unselectRelation();
	        }
	      }
	    }
	  }
	
	  handleMouseUp(e){
	    if (
	      !$(e.target).hasClass("htmlanno-circle") &&
	      !$(e.target).hasClass("htmlanno-arrow")
	    ) {
	      this.getSelectedAnnotations().forEach((annotation) => {
	        annotation.blur();
	      });
	    }
	    // else ... maybe fire an event from annotation or relation.
	  }
	
	  // Unselect the selected highlight(s).
	  //
	  // When call with index, unselect a highlight that is specified by index.
	  // And after, if selected index exists yet, start it's label edit.
	  // When call without index, unselect all highlights.
	  unselectHighlight(target){
	    if (undefined == target){
	      this.getSelectedAnnotations().forEach((annotation) => {
	        if (annotation instanceof Highlight) {
	          annotation.blur();
	        }
	      });
	    } else {
	      target.blur();
	    }
	    return true;
	  }
	
	  unselectRelation(){
	    this.getSelectedAnnotations().forEach((annotation) => {
	      if (annotation instanceof RelationAnnotation) {
	        annotation.blur();
	      }
	    });
	  }
	
	  handleAddSpan(label){
	    let span = this.highlighter.highlight(label.text);
	    if (undefined != span) {
	      WindowEvent.emit('annotationrendered');
	      span.select();
	    }
	  }
	
	  handleAddRelation(params) {
	    let selected = this.getSelectedAnnotations();
	    if (2 == selected.length) {
	      let start = undefined;
	      let end   = undefined;
	      if (selected[0].selectedTimestamp < selected[1].selectedTimestamp) {
	        start = selected[0];
	        end   = selected[1];
	      } else {
	        start = selected[1];
	        end   = selected[0];
	      }
	      let relation = this.arrowConnector.createRelation(
	        annotationContainer.nextId(),
	        start.circle, end.circle,
	        params.type, params.text
	      );
	      this.unselectHighlight();
	      WindowEvent.emit('annotationrendered');
	      relation.select();
	    } else {
	      WindowEvent.emit(
	        'open-alert-dialog',
	        {message: 'Two annotated text spans are not selected.\nTo select multiple annotated spans, click the first annotated span, then Ctrl+Click (Windows) or Cmd+Click (OSX) the second span.'}
	      );
	    }
	  }
	
	  handleExportAnnotation(){
	    return new Promise((resolve, reject) => {
	      resolve(TomlTool.saveToml(annotationContainer.filter((annotation) => {
	        return undefined === annotation.referenceId;
	      })));
	    });
	  }
	
	  displayPrimaryAnnotation(fileName) {
	    let annotation = this.fileContainer.getAnnotation(fileName);
	    annotation.primary = true;
	    if ('bioes' == annotation.subtype) {
	      this._renderBioesAnnotation(annotation);
	    } else {
	      this._renderAnnotation(annotation);
	    }
	  }
	
	  clearPrimaryAnnotation() {
	    this.fileContainer.annotations.forEach((annotation) => {
	      if (annotation.primary) {
	        annotation.primary = false;
	      }
	    });
	    this.remove();
	  }
	
	  /**
	   * (re-)render all annotation that checked for reference.
	   * @param fileNames ... not used.
	   */
	  displayReferenceAnnotation(fileNames) {
	    this.hideReferenceAnnotation(this.getUiAnnotations(true)).then((resolve) => {
	      let selectedUiAnnotations = this.getUiAnnotations(false);
	      selectedUiAnnotations.forEach((uiAnnotation) => {
	        let annotation = this.fileContainer.getAnnotation(uiAnnotation.name);
	        if (annotation.reference) {
	          annotationContainer.forEach((annotationObj) => {
	            if (uiAnnotation.name == annotationObj.referenceId) {
	              annotationObj.setColor(uiAnnotation.color);
	            }
	          });
	        } else {
	          annotation.reference = true;
	          if ('bioes' == annotation.subtype) {
	            this._renderBioesAnnotation(annotation, uiAnnotation);
	          } else { 
	            this._renderAnnotation(annotation, uiAnnotation);
	          }
	        }
	      });
	    });
	  }
	
	  /**
	   * @param annotation ... Annotation object.
	   * @param uiAnnotation . undefined(Primary annotation) or UiAnnotation object(Reference annotation)
	   */
	  _renderBioesAnnotation(annotation, uiAnnotation) {
	    LoadBioesPromise.run(annotation, this).then((results) => {
	      this._renderAnnotation(annotation, uiAnnotation);
	    });
	  }
	
	  /**
	   * @param annotation ... Annotation object.
	   * @param uiAnnotation . undefined(Primary annotation) or UiAnnotation object(Reference annotation)
	   */
	  _renderAnnotation(annotation, uiAnnotation) {
	    if (undefined == uiAnnotation) {
	      TomlTool.loadToml(
	        annotation.content,
	        this.highlighter, this.arrowConnector
	      );
	    } else {
	      TomlTool.loadToml(
	        annotation.content,
	        this.highlighter, this.arrowConnector,
	        uiAnnotation.name, uiAnnotation.color
	      );
	    }
	    WindowEvent.emit('annotationrendered');
	  }
	
	  /**
	   * @return Promise
	   */
	  hideReferenceAnnotation(uiAnnotations) {
	    let annotations = this.fileContainer.getAnnotations(
	      uiAnnotations.map((ann) => {
	        return ann.name;
	      })
	    );
	    let promises = [];
	    annotations.forEach((annotation) => {
	      if (annotation.reference) {
	        annotation.reference = false;
	        promises.push(this.remove(annotation.name));
	      }
	    });
	    return Promise.all(promises);
	  }
	
	  // TODO: この処理はanno-ui側に入れてもらいたい
	  /**
	   * Get the checked/unchecked annotations on dropdown UI.
	   * @param not_selected ... boolean
	   * @param target ... 'Reference' or 'Primary'. when undefined or not specified, this is 'Reference'.
	   */
	  getUiAnnotations(not_selected, target) {
	    not_selected = undefined == not_selected ? true: not_selected;
	    target = undefined == target ? 'Reference' : target;
	    let uiAnnotations = [];
	    $(`#dropdownAnno${target} a`).each((index, element) => {
	      let $elm = $(element);
	      if ($elm.find('.fa-check').hasClass('no-visible') === not_selected) {
	        uiAnnotations.push({
	          name: $elm.find('.js-annoname').text(),
	          color: $elm.find('.sp-preview-inner').css('background-color')
	        });
	      }
	    });
	    return uiAnnotations;
	  }
	
	  loadFiles(files) {
	    // For getCurrentFileNames() in Anno-UI, all dropdown element is turned on.
	    this.hideAnnotationElements('Primary', null); 
	    this.hideAnnotationElements('Reference', null); 
	
	    return this.fileContainer.loadFiles(files);
	  }
	
	  getContentFiles() {
	    return this.fileContainer.contents;
	  }
	
	  getAnnoFiles() {
	    return this.fileContainer.annotations;
	  }
	
	  reloadContent(fileName) {
	    this.useDefaultData = false;
	    this._currentContentFileName = fileName;
	    this.enableDropdownAnnotationPrimary(true);
	
	    let content = this.fileContainer.getContent(fileName);
	    switch(content.type) {
	      case 'html':
	        LoadHtmlPromise.run(content, this).then((results) => {
	          this.remove();
	          content.content = results[1];
	          content.source = undefined;
	          document.getElementById('viewer').innerHTML = content.content;
	          this.handleResize();
	        }).catch((reject) => {
	          this.showReadError();
	        });
	        break;
	
	      case 'bioes':
	        LoadBioesPromise.run(content, this).then((results) => {
	          this.remove();
	          content.content = results[1].content;
	          content.source = undefined;
	          document.getElementById('viewer').innerHTML = content.content;
	          this.enableDropdownAnnotationPrimary(false);
	          // BIOESの場合Content fileとPrimary annotationがセットなので、
	          // これがRefereneで使用されていることは起こりえない。
	          results[1].annotation.primary = true;
	          TomlTool.renderAnnotation(
	            results[1].annotation.content,
	            this.highlighter,
	            this.arrowConnector
	          );
	          WindowEvent.emit('annotationrendered');
	          this.handleResize();
	        }).catch((reject) => {
	          this.showReadError();
	        });
	        break;
	
	      case 'text':
	        LoadTextPromise.run(content, this).then((results) => {
	          this.remove();
	          content.content = results[1];
	          content.source = undefined;
	          document.getElementById('viewer').innerHTML = content.content;
	          this.handleResize();
	        }).catch((reject) => {
	          this.showReadError();
	        });
	        break;
	
	      default:
	        WindowEvent.emit(
	          'open-alert-dialog',
	          {message: 'Unknown content type; ' + content.content}
	        );
	    }
	  }  
	
	  restoreAnnotations(beforeStatus) {
	    let promise = undefined;
	    if (null != beforeStatus.pdfName) {
	      let content = this.fileContainer.getContent(beforeStatus.pdfName);
	      if ('bioes' == content.type) {
	        promise = new Promise((resolve, reject) => {
	          this.enableDropdownAnnotationPrimary(false);
	          beforeStatus.primaryAnnotationName = beforeStatus.pdfName;
	          resolve();
	        });
	      } else {
	        promise = HideBioesAnnotation.create(this);
	      }
	    } else {
	      promise = Promise.resolve(true);
	    }
	    promise.then((resolve) => {
	      if (null != beforeStatus.primaryAnnotationName) {
	        this.displayPrimaryAnnotation(beforeStatus.primaryAnnotationName);
	      }
	      if (0 != beforeStatus.referenceAnnotationNames.length) {
	        // the reference annotation drawing color is set in this process based from Ui.
	        this.displayReferenceAnnotation(beforeStatus.referenceAnnotationNames);
	      }
	    });
	  }
	
	  scrollToAnnotation(id) {
	    let scrollArea = $('#viewerWrapper');
	    let annotation = annotationContainer.findById(id);
	    scrollArea[0].scrollTop = annotation.scrollTop - scrollArea.offset().top;
	    annotation.blink();
	  }
	
	  endEditLabel(id, label) {
	    annotationContainer.findById(id).setContent(label);
	  }
	
	  getSelectedAnnotations() {
	    return annotationContainer.getSelectedAnnotations();
	  }
	
	  /**
	   * When text is selected and clicked annotation add-button,
	   * the selected text is prevented from being released.
	   */
	  handleMouseDown(e) {
	    if ($(e.target).hasClass("js-label")) {
	      e.preventDefault();
	    }
	  }
	
	  /**
	   * @return Promise (resolved)
	   */
	  remove(referenceId) {
	    return Promise.all([
	      this.highlighter.remove(referenceId),
	      this.arrowConnector.remove(referenceId)
	    ]).then((resolve) => {
	      if (undefined == referenceId) {
	        // All remove maybe.
	        WindowEvent.emit('annotationDeleted', {detail: {uuid: undefined} });
	      } else {
	        if (0 != resolve.length) {
	          // deleted.uuid(getter) is accessed after deleted it maybe.
	          let uuid = resolve[0].uuid;
	          WindowEvent.emit('annotationDeleted', {detail: {uuid: uuid} });
	        } else {
	          WindowEvent.emit('annotationDeleted', {detail: {uuid: undefined} });
	        }
	      }
	    }).catch((reject) => {
	      console.log(reject);
	    });
	  }
	
	  loadDefaultData() {
	    $.get({
	      url: this.defaultDataUri,
	      dataType: 'html',
	      success: ((htmlData) => {
	        let content = FileContainer.parseHtml(htmlData);
	        if (undefined != content) {
	          this.useDefaultData = true;
	          this._currentContentFileName = undefined;
	          this.enableDropdownAnnotationPrimary(true);
	          document.getElementById('viewer').innerHTML = content;
	        }
	        globalEvent.emit('resizewindow');
	      }).bind(this)
	    });
	  }
	
	  clearViewer() {
	    this.remove();
	    document.getElementById('viewer').innerHTML = '';
	  }
	
	  showReadError() {
	      WindowEvent.emit('open-alert-dialog', {message: 'Read error.'});
	  }
	
	  // TODO: FileContainer#_excludeBaseDirName() とほぼ同等。 Web上ファイルを扱うようになった場合、これはそちらの処理に入れる
	  excludeBaseUriName(uri) {
	    let fragments = uri.split('/');
	    return fragments[fragments.length - 1];
	  }
	
	  get currentContentFileName() {
	    return this.useDefaultData ?
	      this.defaultDataName :
	      this._currentContentFileName;
	  }
	
	  enableDropdownAnnotationPrimary(enabled) {
	    let dropdown = $('#dropdownAnnoPrimary > button.dropdown-toggle')[0];
	    if (enabled) {
	      dropdown.removeAttribute('disabled', 'disabled');
	    } else {
	      dropdown.setAttribute('disabled', 'disabled');
	    }
	  }
	
	  /**
	   * Hide Primary/Reference annotation files that match pattern(ReExp).
	   * @param target ... 'Primary' or 'Reference'. this is the part of id value. (id="dropdownAnno" + target)
	   * @paran pattern .. the JavaScript RegExp object. or null(all NOT hide = all display)
	   */ 
	  hideAnnotationElements(target, pattern) {
	    $(`#dropdownAnno${target} .js-annoname`).each((index, elm) => {
	      let listElement = $(elm).closest('li');
	      if (null == pattern) {
	        listElement.removeClass('hidden');
	      } else if (pattern.test(elm.innerText)) {
	        listElement.addClass('hidden');
	      } else {
	        listElement.removeClass('hidden');
	      }
	    });
	  }
	}
	
	module.exports = Htmlanno;


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

	const EventEmitter = __webpack_require__(4).EventEmitter
	
	class EventManager{
	  constructor(){
	    this.eventEmitter = new EventEmitter();
	    this.listenerMap = new Map();
	  }
	
	  on(object, event, handler){
	    let map = this.listenerMap.get(object);
	    if (!map){
	      map = new Map();
	      this.listenerMap.set(object, map)
	    }
	    map.set(event, handler);
	
	    this.eventEmitter.on(event, handler);
	  }
	
	  emit(event, data){
	    this.eventEmitter.emit(event, data);
	  }
	
	  removeListenerForObject(object, event){
	    const map = this.listenerMap.get(object);
	    if (!map){
	      return;
	    }
	
	    return this.eventEmitter.removeListener(event, map.get(event));
	  }
	
	  removeObject(object){
	    const map = this.listenerMap.get(object);
	    if (!map){
	      return;
	    }
	
	    for (var [key, value] of map){
	      this.eventEmitter.removeListener(key, value);
	    }
	
	    this.listenerMap.delete(object);
	  }
	
	  eventMap(object){
	    return this.listenerMap.get(object);
	  }
	}
	
	module.exports = EventManager;


/***/ }),
/* 4 */
/***/ (function(module, exports) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.
	
	function EventEmitter() {
	  this._events = this._events || {};
	  this._maxListeners = this._maxListeners || undefined;
	}
	module.exports = EventEmitter;
	
	// Backwards-compat with node 0.10.x
	EventEmitter.EventEmitter = EventEmitter;
	
	EventEmitter.prototype._events = undefined;
	EventEmitter.prototype._maxListeners = undefined;
	
	// By default EventEmitters will print a warning if more than 10 listeners are
	// added to it. This is a useful default which helps finding memory leaks.
	EventEmitter.defaultMaxListeners = 10;
	
	// Obviously not all Emitters should be limited to 10. This function allows
	// that to be increased. Set to zero for unlimited.
	EventEmitter.prototype.setMaxListeners = function(n) {
	  if (!isNumber(n) || n < 0 || isNaN(n))
	    throw TypeError('n must be a positive number');
	  this._maxListeners = n;
	  return this;
	};
	
	EventEmitter.prototype.emit = function(type) {
	  var er, handler, len, args, i, listeners;
	
	  if (!this._events)
	    this._events = {};
	
	  // If there is no 'error' event listener then throw.
	  if (type === 'error') {
	    if (!this._events.error ||
	        (isObject(this._events.error) && !this._events.error.length)) {
	      er = arguments[1];
	      if (er instanceof Error) {
	        throw er; // Unhandled 'error' event
	      } else {
	        // At least give some kind of context to the user
	        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
	        err.context = er;
	        throw err;
	      }
	    }
	  }
	
	  handler = this._events[type];
	
	  if (isUndefined(handler))
	    return false;
	
	  if (isFunction(handler)) {
	    switch (arguments.length) {
	      // fast cases
	      case 1:
	        handler.call(this);
	        break;
	      case 2:
	        handler.call(this, arguments[1]);
	        break;
	      case 3:
	        handler.call(this, arguments[1], arguments[2]);
	        break;
	      // slower
	      default:
	        args = Array.prototype.slice.call(arguments, 1);
	        handler.apply(this, args);
	    }
	  } else if (isObject(handler)) {
	    args = Array.prototype.slice.call(arguments, 1);
	    listeners = handler.slice();
	    len = listeners.length;
	    for (i = 0; i < len; i++)
	      listeners[i].apply(this, args);
	  }
	
	  return true;
	};
	
	EventEmitter.prototype.addListener = function(type, listener) {
	  var m;
	
	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');
	
	  if (!this._events)
	    this._events = {};
	
	  // To avoid recursion in the case that type === "newListener"! Before
	  // adding it to the listeners, first emit "newListener".
	  if (this._events.newListener)
	    this.emit('newListener', type,
	              isFunction(listener.listener) ?
	              listener.listener : listener);
	
	  if (!this._events[type])
	    // Optimize the case of one listener. Don't need the extra array object.
	    this._events[type] = listener;
	  else if (isObject(this._events[type]))
	    // If we've already got an array, just append.
	    this._events[type].push(listener);
	  else
	    // Adding the second element, need to change to array.
	    this._events[type] = [this._events[type], listener];
	
	  // Check for listener leak
	  if (isObject(this._events[type]) && !this._events[type].warned) {
	    if (!isUndefined(this._maxListeners)) {
	      m = this._maxListeners;
	    } else {
	      m = EventEmitter.defaultMaxListeners;
	    }
	
	    if (m && m > 0 && this._events[type].length > m) {
	      this._events[type].warned = true;
	      console.error('(node) warning: possible EventEmitter memory ' +
	                    'leak detected. %d listeners added. ' +
	                    'Use emitter.setMaxListeners() to increase limit.',
	                    this._events[type].length);
	      if (typeof console.trace === 'function') {
	        // not supported in IE 10
	        console.trace();
	      }
	    }
	  }
	
	  return this;
	};
	
	EventEmitter.prototype.on = EventEmitter.prototype.addListener;
	
	EventEmitter.prototype.once = function(type, listener) {
	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');
	
	  var fired = false;
	
	  function g() {
	    this.removeListener(type, g);
	
	    if (!fired) {
	      fired = true;
	      listener.apply(this, arguments);
	    }
	  }
	
	  g.listener = listener;
	  this.on(type, g);
	
	  return this;
	};
	
	// emits a 'removeListener' event iff the listener was removed
	EventEmitter.prototype.removeListener = function(type, listener) {
	  var list, position, length, i;
	
	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');
	
	  if (!this._events || !this._events[type])
	    return this;
	
	  list = this._events[type];
	  length = list.length;
	  position = -1;
	
	  if (list === listener ||
	      (isFunction(list.listener) && list.listener === listener)) {
	    delete this._events[type];
	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);
	
	  } else if (isObject(list)) {
	    for (i = length; i-- > 0;) {
	      if (list[i] === listener ||
	          (list[i].listener && list[i].listener === listener)) {
	        position = i;
	        break;
	      }
	    }
	
	    if (position < 0)
	      return this;
	
	    if (list.length === 1) {
	      list.length = 0;
	      delete this._events[type];
	    } else {
	      list.splice(position, 1);
	    }
	
	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);
	  }
	
	  return this;
	};
	
	EventEmitter.prototype.removeAllListeners = function(type) {
	  var key, listeners;
	
	  if (!this._events)
	    return this;
	
	  // not listening for removeListener, no need to emit
	  if (!this._events.removeListener) {
	    if (arguments.length === 0)
	      this._events = {};
	    else if (this._events[type])
	      delete this._events[type];
	    return this;
	  }
	
	  // emit removeListener for all listeners on all events
	  if (arguments.length === 0) {
	    for (key in this._events) {
	      if (key === 'removeListener') continue;
	      this.removeAllListeners(key);
	    }
	    this.removeAllListeners('removeListener');
	    this._events = {};
	    return this;
	  }
	
	  listeners = this._events[type];
	
	  if (isFunction(listeners)) {
	    this.removeListener(type, listeners);
	  } else if (listeners) {
	    // LIFO order
	    while (listeners.length)
	      this.removeListener(type, listeners[listeners.length - 1]);
	  }
	  delete this._events[type];
	
	  return this;
	};
	
	EventEmitter.prototype.listeners = function(type) {
	  var ret;
	  if (!this._events || !this._events[type])
	    ret = [];
	  else if (isFunction(this._events[type]))
	    ret = [this._events[type]];
	  else
	    ret = this._events[type].slice();
	  return ret;
	};
	
	EventEmitter.prototype.listenerCount = function(type) {
	  if (this._events) {
	    var evlistener = this._events[type];
	
	    if (isFunction(evlistener))
	      return 1;
	    else if (evlistener)
	      return evlistener.length;
	  }
	  return 0;
	};
	
	EventEmitter.listenerCount = function(emitter, type) {
	  return emitter.listenerCount(type);
	};
	
	function isFunction(arg) {
	  return typeof arg === 'function';
	}
	
	function isNumber(arg) {
	  return typeof arg === 'number';
	}
	
	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}
	
	function isUndefined(arg) {
	  return arg === void 0;
	}


/***/ }),
/* 5 */
/***/ (function(module, exports) {

	class AnnotationContainer{
	  constructor(){
	    this.set = new Set();
	    this.maxId = 0;
	  }
	
	  /**
	   * htmlanno only
	   */
	  isAnnotation(obj){
	    return (undefined != obj.equals && undefined != obj.getId);
	  }
	
	  /**
	   * Issue a ID for annotation object.
	   *
	   * htmlanno only
	   */
	  nextId(){
	    return ++this.maxId;
	  }
	
	  add(annotation){
	    if (!this.isAnnotation(annotation)) {
	      return false;
	    }
	    this.maxId = Math.max(this.maxId, parseInt(annotation.getId()));
	    this.set.add(annotation);
	    return true;
	  }
	
	  findById(id){
	    let obj = null;
	    this.set.forEach((elm)=>{
	      if (elm.getId() == id) {
	        obj = elm;
	      }
	    });
	    return obj;
	  }
	
	  // TODO: 排他制御
	  remove(annotationOrId){
	    let elm = typeof(annotationOrId) === "string" ?
	      this.findById(annotationOrId):
	      this.findById(annotationOrId.getId());
	
	    if (undefined != elm) {
	      if (undefined != elm.remove) {
	        elm.remove();
	      }
	      return this.set.delete(elm);
	    }
	    return false;
	  }
	
	  /**
	   * htmlanno only
	   */
	  forEach(callback){
	    this.set.forEach(callback);
	  }
	
	  // TODO: pdfanno only
	  destroy(){
	  }
	
	  filter(callback) {
	    let newContainer = new AnnotationContainer();
	    this.set.forEach((elm) => {
	      if (callback(elm)) {
	        newContainer.add(elm);
	      }
	    });
	    return newContainer;
	  }
	
	  /**
	   * Get all annotations from the container.
	   */
	  getAllAnnotations(){
	    let list = [];
	    this.set.forEach(a => list.push(a));
	    return list;
	  }
	
	  getSelectedAnnotations(){
	    let list = [];
	    this.set.forEach((annotation) => {
	      if (annotation.selected) {
	        list.push(annotation);
	      }
	    });
	    return list;
	  }
	
	  // TODO: pdfanno only
	  enableAll(){
	  }
	
	  // TODO: pdfanno only
	  disableAll(){
	  }
	}
	module.exports = AnnotationContainer;


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

	(function webpackUniversalModuleDefinition(root, factory) {
		if(true)
			module.exports = factory();
		else if(typeof define === 'function' && define.amd)
			define([], factory);
		else if(typeof exports === 'object')
			exports["annoUI"] = factory();
		else
			root["annoUI"] = factory();
	})(this, function() {
	return /******/ (function(modules) { // webpackBootstrap
	/******/ 	// The module cache
	/******/ 	var installedModules = {};
	/******/
	/******/ 	// The require function
	/******/ 	function __webpack_require__(moduleId) {
	/******/
	/******/ 		// Check if module is in cache
	/******/ 		if(installedModules[moduleId]) {
	/******/ 			return installedModules[moduleId].exports;
	/******/ 		}
	/******/ 		// Create a new module (and put it into the cache)
	/******/ 		var module = installedModules[moduleId] = {
	/******/ 			i: moduleId,
	/******/ 			l: false,
	/******/ 			exports: {}
	/******/ 		};
	/******/
	/******/ 		// Execute the module function
	/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
	/******/
	/******/ 		// Flag the module as loaded
	/******/ 		module.l = true;
	/******/
	/******/ 		// Return the exports of the module
	/******/ 		return module.exports;
	/******/ 	}
	/******/
	/******/
	/******/ 	// expose the modules object (__webpack_modules__)
	/******/ 	__webpack_require__.m = modules;
	/******/
	/******/ 	// expose the module cache
	/******/ 	__webpack_require__.c = installedModules;
	/******/
	/******/ 	// define getter function for harmony exports
	/******/ 	__webpack_require__.d = function(exports, name, getter) {
	/******/ 		if(!__webpack_require__.o(exports, name)) {
	/******/ 			Object.defineProperty(exports, name, {
	/******/ 				configurable: false,
	/******/ 				enumerable: true,
	/******/ 				get: getter
	/******/ 			});
	/******/ 		}
	/******/ 	};
	/******/
	/******/ 	// getDefaultExport function for compatibility with non-harmony modules
	/******/ 	__webpack_require__.n = function(module) {
	/******/ 		var getter = module && module.__esModule ?
	/******/ 			function getDefault() { return module['default']; } :
	/******/ 			function getModuleExports() { return module; };
	/******/ 		__webpack_require__.d(getter, 'a', getter);
	/******/ 		return getter;
	/******/ 	};
	/******/
	/******/ 	// Object.prototype.hasOwnProperty.call
	/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
	/******/
	/******/ 	// __webpack_public_path__
	/******/ 	__webpack_require__.p = "";
	/******/
	/******/ 	// Load entry module and return exports
	/******/ 	return __webpack_require__(__webpack_require__.s = 4);
	/******/ })
	/************************************************************************/
	/******/ ([
	/* 0 */
	/***/ (function(module, __webpack_exports__, __webpack_require__) {
	
	"use strict";
	Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
	/* harmony export (immutable) */ __webpack_exports__["create"] = create;
	/* harmony export (immutable) */ __webpack_exports__["show"] = show;
	/**
	 * UI - Alert dialog.
	 */
	__webpack_require__(9)
	
	function create ({ type = 'alert', message = '' }) {
	    const id = 'modal-' + (new Date().getTime())
	
	    const styleClass = (type === 'alert' ? 'alertdialog-danger' : '')
	
	    const snipet = `
	        <div id="${id}" class="alertdialog modal fade ${styleClass}" role="dialog">
	          <div class="modal-dialog">
	            <div class="modal-content">
	              <div class="modal-header">
	                <h4 class="modal-title">Error</h4>
	              </div>
	              <div class="modal-body">
	                <p>${message}</p>
	              </div>
	              <div class="modal-footer">
	                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
	              </div>
	            </div>
	          </div>
	        </div>
	    `
	    $(document.body).append(snipet)
	
	    return $('#' + id)
	}
	
	function show () {
	    const $modal = create(...arguments)
	    $modal.modal('show')
	    return $modal
	}
	
	
	/***/ }),
	/* 1 */
	/***/ (function(module, exports) {
	
	/*
		MIT License http://www.opensource.org/licenses/mit-license.php
		Author Tobias Koppers @sokra
	*/
	// css base code, injected by the css-loader
	module.exports = function(useSourceMap) {
		var list = [];
	
		// return the list of modules as css string
		list.toString = function toString() {
			return this.map(function (item) {
				var content = cssWithMappingToString(item, useSourceMap);
				if(item[2]) {
					return "@media " + item[2] + "{" + content + "}";
				} else {
					return content;
				}
			}).join("");
		};
	
		// import a list of modules into the list
		list.i = function(modules, mediaQuery) {
			if(typeof modules === "string")
				modules = [[null, modules, ""]];
			var alreadyImportedModules = {};
			for(var i = 0; i < this.length; i++) {
				var id = this[i][0];
				if(typeof id === "number")
					alreadyImportedModules[id] = true;
			}
			for(i = 0; i < modules.length; i++) {
				var item = modules[i];
				// skip already imported module
				// this implementation is not 100% perfect for weird media query combinations
				//  when a module is imported multiple times with different media queries.
				//  I hope this will never occur (Hey this way we have smaller bundles)
				if(typeof item[0] !== "number" || !alreadyImportedModules[item[0]]) {
					if(mediaQuery && !item[2]) {
						item[2] = mediaQuery;
					} else if(mediaQuery) {
						item[2] = "(" + item[2] + ") and (" + mediaQuery + ")";
					}
					list.push(item);
				}
			}
		};
		return list;
	};
	
	function cssWithMappingToString(item, useSourceMap) {
		var content = item[1] || '';
		var cssMapping = item[3];
		if (!cssMapping) {
			return content;
		}
	
		if (useSourceMap && typeof btoa === 'function') {
			var sourceMapping = toComment(cssMapping);
			var sourceURLs = cssMapping.sources.map(function (source) {
				return '/*# sourceURL=' + cssMapping.sourceRoot + source + ' */'
			});
	
			return [content].concat(sourceURLs).concat([sourceMapping]).join('\n');
		}
	
		return [content].join('\n');
	}
	
	// Adapted from convert-source-map (MIT)
	function toComment(sourceMap) {
		// eslint-disable-next-line no-undef
		var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap))));
		var data = 'sourceMappingURL=data:application/json;charset=utf-8;base64,' + base64;
	
		return '/*# ' + data + ' */';
	}
	
	
	/***/ }),
	/* 2 */
	/***/ (function(module, exports, __webpack_require__) {
	
	/*
		MIT License http://www.opensource.org/licenses/mit-license.php
		Author Tobias Koppers @sokra
	*/
	
	var stylesInDom = {};
	
	var	memoize = function (fn) {
		var memo;
	
		return function () {
			if (typeof memo === "undefined") memo = fn.apply(this, arguments);
			return memo;
		};
	};
	
	var isOldIE = memoize(function () {
		// Test for IE <= 9 as proposed by Browserhacks
		// @see http://browserhacks.com/#hack-e71d8692f65334173fee715c222cb805
		// Tests for existence of standard globals is to allow style-loader
		// to operate correctly into non-standard environments
		// @see https://github.com/webpack-contrib/style-loader/issues/177
		return window && document && document.all && !window.atob;
	});
	
	var getElement = (function (fn) {
		var memo = {};
	
		return function(selector) {
			if (typeof memo[selector] === "undefined") {
				memo[selector] = fn.call(this, selector);
			}
	
			return memo[selector]
		};
	})(function (target) {
		return document.querySelector(target)
	});
	
	var singleton = null;
	var	singletonCounter = 0;
	var	stylesInsertedAtTop = [];
	
	var	fixUrls = __webpack_require__(7);
	
	module.exports = function(list, options) {
		if (false) {
			if (typeof document !== "object") throw new Error("The style-loader cannot be used in a non-browser environment");
		}
	
		options = options || {};
	
		options.attrs = typeof options.attrs === "object" ? options.attrs : {};
	
		// Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
		// tags it will allow on a page
		if (!options.singleton) options.singleton = isOldIE();
	
		// By default, add <style> tags to the <head> element
		if (!options.insertInto) options.insertInto = "head";
	
		// By default, add <style> tags to the bottom of the target
		if (!options.insertAt) options.insertAt = "bottom";
	
		var styles = listToStyles(list, options);
	
		addStylesToDom(styles, options);
	
		return function update (newList) {
			var mayRemove = [];
	
			for (var i = 0; i < styles.length; i++) {
				var item = styles[i];
				var domStyle = stylesInDom[item.id];
	
				domStyle.refs--;
				mayRemove.push(domStyle);
			}
	
			if(newList) {
				var newStyles = listToStyles(newList, options);
				addStylesToDom(newStyles, options);
			}
	
			for (var i = 0; i < mayRemove.length; i++) {
				var domStyle = mayRemove[i];
	
				if(domStyle.refs === 0) {
					for (var j = 0; j < domStyle.parts.length; j++) domStyle.parts[j]();
	
					delete stylesInDom[domStyle.id];
				}
			}
		};
	};
	
	function addStylesToDom (styles, options) {
		for (var i = 0; i < styles.length; i++) {
			var item = styles[i];
			var domStyle = stylesInDom[item.id];
	
			if(domStyle) {
				domStyle.refs++;
	
				for(var j = 0; j < domStyle.parts.length; j++) {
					domStyle.parts[j](item.parts[j]);
				}
	
				for(; j < item.parts.length; j++) {
					domStyle.parts.push(addStyle(item.parts[j], options));
				}
			} else {
				var parts = [];
	
				for(var j = 0; j < item.parts.length; j++) {
					parts.push(addStyle(item.parts[j], options));
				}
	
				stylesInDom[item.id] = {id: item.id, refs: 1, parts: parts};
			}
		}
	}
	
	function listToStyles (list, options) {
		var styles = [];
		var newStyles = {};
	
		for (var i = 0; i < list.length; i++) {
			var item = list[i];
			var id = options.base ? item[0] + options.base : item[0];
			var css = item[1];
			var media = item[2];
			var sourceMap = item[3];
			var part = {css: css, media: media, sourceMap: sourceMap};
	
			if(!newStyles[id]) styles.push(newStyles[id] = {id: id, parts: [part]});
			else newStyles[id].parts.push(part);
		}
	
		return styles;
	}
	
	function insertStyleElement (options, style) {
		var target = getElement(options.insertInto)
	
		if (!target) {
			throw new Error("Couldn't find a style target. This probably means that the value for the 'insertInto' parameter is invalid.");
		}
	
		var lastStyleElementInsertedAtTop = stylesInsertedAtTop[stylesInsertedAtTop.length - 1];
	
		if (options.insertAt === "top") {
			if (!lastStyleElementInsertedAtTop) {
				target.insertBefore(style, target.firstChild);
			} else if (lastStyleElementInsertedAtTop.nextSibling) {
				target.insertBefore(style, lastStyleElementInsertedAtTop.nextSibling);
			} else {
				target.appendChild(style);
			}
			stylesInsertedAtTop.push(style);
		} else if (options.insertAt === "bottom") {
			target.appendChild(style);
		} else {
			throw new Error("Invalid value for parameter 'insertAt'. Must be 'top' or 'bottom'.");
		}
	}
	
	function removeStyleElement (style) {
		if (style.parentNode === null) return false;
		style.parentNode.removeChild(style);
	
		var idx = stylesInsertedAtTop.indexOf(style);
		if(idx >= 0) {
			stylesInsertedAtTop.splice(idx, 1);
		}
	}
	
	function createStyleElement (options) {
		var style = document.createElement("style");
	
		options.attrs.type = "text/css";
	
		addAttrs(style, options.attrs);
		insertStyleElement(options, style);
	
		return style;
	}
	
	function createLinkElement (options) {
		var link = document.createElement("link");
	
		options.attrs.type = "text/css";
		options.attrs.rel = "stylesheet";
	
		addAttrs(link, options.attrs);
		insertStyleElement(options, link);
	
		return link;
	}
	
	function addAttrs (el, attrs) {
		Object.keys(attrs).forEach(function (key) {
			el.setAttribute(key, attrs[key]);
		});
	}
	
	function addStyle (obj, options) {
		var style, update, remove, result;
	
		// If a transform function was defined, run it on the css
		if (options.transform && obj.css) {
		    result = options.transform(obj.css);
	
		    if (result) {
		    	// If transform returns a value, use that instead of the original css.
		    	// This allows running runtime transformations on the css.
		    	obj.css = result;
		    } else {
		    	// If the transform function returns a falsy value, don't add this css.
		    	// This allows conditional loading of css
		    	return function() {
		    		// noop
		    	};
		    }
		}
	
		if (options.singleton) {
			var styleIndex = singletonCounter++;
	
			style = singleton || (singleton = createStyleElement(options));
	
			update = applyToSingletonTag.bind(null, style, styleIndex, false);
			remove = applyToSingletonTag.bind(null, style, styleIndex, true);
	
		} else if (
			obj.sourceMap &&
			typeof URL === "function" &&
			typeof URL.createObjectURL === "function" &&
			typeof URL.revokeObjectURL === "function" &&
			typeof Blob === "function" &&
			typeof btoa === "function"
		) {
			style = createLinkElement(options);
			update = updateLink.bind(null, style, options);
			remove = function () {
				removeStyleElement(style);
	
				if(style.href) URL.revokeObjectURL(style.href);
			};
		} else {
			style = createStyleElement(options);
			update = applyToTag.bind(null, style);
			remove = function () {
				removeStyleElement(style);
			};
		}
	
		update(obj);
	
		return function updateStyle (newObj) {
			if (newObj) {
				if (
					newObj.css === obj.css &&
					newObj.media === obj.media &&
					newObj.sourceMap === obj.sourceMap
				) {
					return;
				}
	
				update(obj = newObj);
			} else {
				remove();
			}
		};
	}
	
	var replaceText = (function () {
		var textStore = [];
	
		return function (index, replacement) {
			textStore[index] = replacement;
	
			return textStore.filter(Boolean).join('\n');
		};
	})();
	
	function applyToSingletonTag (style, index, remove, obj) {
		var css = remove ? "" : obj.css;
	
		if (style.styleSheet) {
			style.styleSheet.cssText = replaceText(index, css);
		} else {
			var cssNode = document.createTextNode(css);
			var childNodes = style.childNodes;
	
			if (childNodes[index]) style.removeChild(childNodes[index]);
	
			if (childNodes.length) {
				style.insertBefore(cssNode, childNodes[index]);
			} else {
				style.appendChild(cssNode);
			}
		}
	}
	
	function applyToTag (style, obj) {
		var css = obj.css;
		var media = obj.media;
	
		if(media) {
			style.setAttribute("media", media)
		}
	
		if(style.styleSheet) {
			style.styleSheet.cssText = css;
		} else {
			while(style.firstChild) {
				style.removeChild(style.firstChild);
			}
	
			style.appendChild(document.createTextNode(css));
		}
	}
	
	function updateLink (link, options, obj) {
		var css = obj.css;
		var sourceMap = obj.sourceMap;
	
		/*
			If convertToAbsoluteUrls isn't defined, but sourcemaps are enabled
			and there is no publicPath defined then lets turn convertToAbsoluteUrls
			on by default.  Otherwise default to the convertToAbsoluteUrls option
			directly
		*/
		var autoFixUrls = options.convertToAbsoluteUrls === undefined && sourceMap;
	
		if (options.convertToAbsoluteUrls || autoFixUrls) {
			css = fixUrls(css);
		}
	
		if (sourceMap) {
			// http://stackoverflow.com/a/26603875
			css += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))) + " */";
		}
	
		var blob = new Blob([css], { type: "text/css" });
	
		var oldSrc = link.href;
	
		link.href = URL.createObjectURL(blob);
	
		if(oldSrc) URL.revokeObjectURL(oldSrc);
	}
	
	
	/***/ }),
	/* 3 */
	/***/ (function(module, __webpack_exports__, __webpack_require__) {
	
	"use strict";
	Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
	/* harmony export (immutable) */ __webpack_exports__["setupResizableColumns"] = setupResizableColumns;
	/* harmony export (immutable) */ __webpack_exports__["tomlString"] = tomlString;
	/* harmony export (immutable) */ __webpack_exports__["uuid"] = uuid;
	/**
	 * Make the UI resizable.
	 */
	function setupResizableColumns () {
	    // Make resizable.
	    $('#tools').resizable({
	        handles           : 'e',
	        alsoResizeReverse : '#viewerWrapper',
	        start             : () => {
	            $('#viewer iframe').css({
	                'pointer-events' : 'none'
	            })
	        },
	        stop : () => {
	            $('#viewer iframe').css({
	                'pointer-events' : 'auto'
	            })
	        }
	    })
	
	    // Customize.
	    $.ui.plugin.add('resizable', 'alsoResizeReverse', {
	
	        start : function () {
	            let that = $(this).resizable('instance')
	            let o = that.options
	
	            $(o.alsoResizeReverse).each(function () {
	                var el = $(this)
	                el.data('ui-resizable-alsoresizeReverse', {
	                    width  : parseInt(el.width(), 10),
	                    height : parseInt(el.height(), 10),
	                    left   : parseInt(el.css('left'), 10),
	                    top    : parseInt(el.css('top'), 10)
	                })
	            })
	        },
	
	        resize : function (event, ui) {
	            let that = $(this).resizable('instance')
	            let o = that.options
	            let os = that.originalSize
	            let op = that.originalPosition
	            let delta = {
	                height : (that.size.height - os.height) || 0,
	                width  : (that.size.width - os.width) || 0,
	                top    : (that.position.top - op.top) || 0,
	                left   : (that.position.left - op.left) || 0
	            }
	
	            $(o.alsoResizeReverse).each(function () {
	                let el = $(this)
	                let start = $(this).data('ui-resizable-alsoresize-reverse')
	                let style = {}
	                let css = el.parents(ui.originalElement[0]).length
	                        ? [ 'width', 'height' ]
	                        : [ 'width', 'height', 'top', 'left' ]
	
	                $.each(css, function (i, prop) {
	                    let sum = (start[prop] || 0) - (delta[prop] || 0)
	                    if (sum && sum >= 0) {
	                        style[prop] = sum || null
	                    }
	                })
	
	                el.css(style)
	            })
	        },
	
	        stop : function () {
	            $(this).removeData('resizable-alsoresize-reverse')
	        }
	    })
	}
	
	/**
	 * Convert object to TOML String.
	 */
	function tomlString (obj, root = true) {
	    let lines = []
	
	    // `version` is first.
	    if ('version' in obj) {
	        lines.push(`version = "${obj['version']}"`)
	        lines.push('')
	        delete obj['version']
	    }
	
	    // #paperanno-ja/issues/38
	    // Make all values in `position` as string.
	    if ('position' in obj) {
	        let position = obj.position
	        position = position.map(p => {
	            if (typeof p === 'number') {
	                return String(p)
	            } else {
	                return p.map(v => String(v))
	            }
	        })
	        obj.position = position
	    }
	
	    Object.keys(obj).forEach(prop => {
	        let val = obj[prop]
	        if (typeof val === 'string') {
	            lines.push(`${prop} = "${val}"`)
	            root && lines.push('')
	        } else if (typeof val === 'number') {
	            lines.push(`${prop} = ${val}`)
	            root && lines.push('')
	        } else if (isArray(val)) {
	            lines.push(`${prop} = ${JSON.stringify(val)}`)
	            root && lines.push('')
	        } else if (typeof val === 'object') {
	            lines.push(`[${prop}]`)
	            lines.push(tomlString(val, false))
	            root && lines.push('')
	        }
	    })
	
	    return lines.join('\n')
	}
	
	function isArray (val) {
	    return val && 'length' in val
	}
	
	
	/**
	 * Generate a universally unique identifier
	 *
	 * @return {String}
	 */
	function uuid () {
	
	    let uid = 0
	    window.annotationContainer.getAllAnnotations().forEach(a => {
	        uid = Math.max(uid, parseInt(a.uuid))
	    })
	    return String(uid + 1)
	}
	
	
	/***/ }),
	/* 4 */
	/***/ (function(module, __webpack_exports__, __webpack_require__) {
	
	"use strict";
	Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__components_browseButton__ = __webpack_require__(8);
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__components_contentDropdown__ = __webpack_require__(11);
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__components_primaryAnnoDropdown__ = __webpack_require__(12);
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_referenceAnnoDropdown__ = __webpack_require__(13);
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_annoListDropdown__ = __webpack_require__(14);
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__components_downloadButton__ = __webpack_require__(15);
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__components_annoRectButton__ = __webpack_require__(16);
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__components_annoRelButton__ = __webpack_require__(17);
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__components_annoSpanButton__ = __webpack_require__(18);
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__components_labelInput__ = __webpack_require__(19);
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__components_uploadButton__ = __webpack_require__(25);
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__uis__ = __webpack_require__(27);
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12__events__ = __webpack_require__(28);
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13__utils__ = __webpack_require__(3);
	/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "browseButton", function() { return __WEBPACK_IMPORTED_MODULE_0__components_browseButton__; });
	/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "contentDropdown", function() { return __WEBPACK_IMPORTED_MODULE_1__components_contentDropdown__; });
	/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "primaryAnnoDropdown", function() { return __WEBPACK_IMPORTED_MODULE_2__components_primaryAnnoDropdown__; });
	/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "referenceAnnoDropdown", function() { return __WEBPACK_IMPORTED_MODULE_3__components_referenceAnnoDropdown__; });
	/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "annoListDropdown", function() { return __WEBPACK_IMPORTED_MODULE_4__components_annoListDropdown__; });
	/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "downloadButton", function() { return __WEBPACK_IMPORTED_MODULE_5__components_downloadButton__; });
	/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "annoRectButton", function() { return __WEBPACK_IMPORTED_MODULE_6__components_annoRectButton__; });
	/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "annoRelButton", function() { return __WEBPACK_IMPORTED_MODULE_7__components_annoRelButton__; });
	/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "annoSpanButton", function() { return __WEBPACK_IMPORTED_MODULE_8__components_annoSpanButton__; });
	/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "labelInput", function() { return __WEBPACK_IMPORTED_MODULE_9__components_labelInput__; });
	/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "uploadButton", function() { return __WEBPACK_IMPORTED_MODULE_10__components_uploadButton__; });
	/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "ui", function() { return __WEBPACK_IMPORTED_MODULE_11__uis__; });
	/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "event", function() { return __WEBPACK_IMPORTED_MODULE_12__events__; });
	/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "util", function() { return __WEBPACK_IMPORTED_MODULE_13__utils__; });
	__webpack_require__(5)
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	/***/ }),
	/* 5 */
	/***/ (function(module, exports, __webpack_require__) {
	
	// style-loader: Adds some css to the DOM by adding a <style> tag
	
	// load the styles
	var content = __webpack_require__(6);
	if(typeof content === 'string') content = [[module.i, content, '']];
	// Prepare cssTransformation
	var transform;
	
	var options = {}
	options.transform = transform
	// add the styles to the DOM
	var update = __webpack_require__(2)(content, options);
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!../node_modules/css-loader/index.js!./index.css", function() {
				var newContent = require("!!../node_modules/css-loader/index.js!./index.css");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}
	
	/***/ }),
	/* 6 */
	/***/ (function(module, exports, __webpack_require__) {
	
	exports = module.exports = __webpack_require__(1)(undefined);
	// imports
	
	
	// module
	exports.push([module.i, "@charset 'utf-8';\n\n/* Reset CSS */\nhtml{color:#000;background:#FFF}body,div,dl,dt,dd,ul,ol,li,h1,h2,h3,h4,h5,h6,pre,code,form,fieldset,legend,input,textarea,p,blockquote,th,td{margin:0;padding:0}table{border-collapse:collapse;border-spacing:0}fieldset,img{border:0}address,caption,cite,code,dfn,em,strong,th,var{font-style:normal;font-weight:normal}ol,ul{list-style:none}caption,th{text-align:left}h1,h2,h3,h4,h5,h6{font-size:100%;font-weight:normal}q:before,q:after{content:''}abbr,acronym{border:0;font-variant:normal}sup{vertical-align:text-top}sub{vertical-align:text-bottom}input,textarea,select{font-family:inherit;font-size:inherit;font-weight:inherit;*font-size:100%}legend{color:#000}\n\n/* Super Hack to disable autofill style for Chrome. */\ninput:-webkit-autofill,\ninput:-webkit-autofill:hover,\ninput:-webkit-autofill:focus,\ninput:-webkit-autofill:active {\n    transition: background-color 5000s ease-in-out 0s;\n}\n\n.u-mt-10 {margin-top: 10px;}\n.u-mt-20 {margin-top: 20px;}\n.u-mb-10 {margin-bottom: 10px;}\n.u-ml-15 {margin-left: 15px;}\n.u-disp-iblock {display: inline-block;}\n.no-visible {visibility: hidden;}\n.no-action {pointer-events: none;}\n\n/**\n * Viewer size.\n * This height will be override to fit the browser height (by pdfanno.js).\n */\n.anno-viewer {\n    width: 100%;\n    height: 500px;\n}\n\n/**\n * Annotation Select UI Layout.\n */\n.anno-select-layout {}\n.anno-select-layout .row:first-child {\n    margin-bottom: 10px;\n}\n.anno-select-layout [type=\"radio\"] {\n    margin-right: 5px;\n}\n.anno-select-layout [type=\"file\"] {\n    display: inline-block;\n    margin-left: 5px;\n    line-height: 1em;\n}\n.anno-select-layout .sp-replacer {\n    padding: 0;\n    border: none;\n}\n.anno-select-layout .sp-dd {\n    display: none;\n}\n\n/**\n * Dropdown.\n */\n.dropdown-menu {\n    overflow: scroll;\n}\n\n/**\n * Color picker.\n */\n.anno-ui .sp-replacer {\n    padding: 0;\n    border: none;\n}\n.anno-ui .sp-dd {\n    display: none;\n}\n.anno-ui .sp-preview {\n    margin-right: 0;\n}\n", ""]);
	
	// exports
	
	
	/***/ }),
	/* 7 */
	/***/ (function(module, exports) {
	
	
	/**
	 * When source maps are enabled, `style-loader` uses a link element with a data-uri to
	 * embed the css on the page. This breaks all relative urls because now they are relative to a
	 * bundle instead of the current page.
	 *
	 * One solution is to only use full urls, but that may be impossible.
	 *
	 * Instead, this function "fixes" the relative urls to be absolute according to the current page location.
	 *
	 * A rudimentary test suite is located at `test/fixUrls.js` and can be run via the `npm test` command.
	 *
	 */
	
	module.exports = function (css) {
	  // get current location
	  var location = typeof window !== "undefined" && window.location;
	
	  if (!location) {
	    throw new Error("fixUrls requires window.location");
	  }
	
		// blank or null?
		if (!css || typeof css !== "string") {
		  return css;
	  }
	
	  var baseUrl = location.protocol + "//" + location.host;
	  var currentDir = baseUrl + location.pathname.replace(/\/[^\/]*$/, "/");
	
		// convert each url(...)
		/*
		This regular expression is just a way to recursively match brackets within
		a string.
	
		 /url\s*\(  = Match on the word "url" with any whitespace after it and then a parens
		   (  = Start a capturing group
		     (?:  = Start a non-capturing group
		         [^)(]  = Match anything that isn't a parentheses
		         |  = OR
		         \(  = Match a start parentheses
		             (?:  = Start another non-capturing groups
		                 [^)(]+  = Match anything that isn't a parentheses
		                 |  = OR
		                 \(  = Match a start parentheses
		                     [^)(]*  = Match anything that isn't a parentheses
		                 \)  = Match a end parentheses
		             )  = End Group
	              *\) = Match anything and then a close parens
	          )  = Close non-capturing group
	          *  = Match anything
	       )  = Close capturing group
		 \)  = Match a close parens
	
		 /gi  = Get all matches, not the first.  Be case insensitive.
		 */
		var fixedCss = css.replace(/url\s*\(((?:[^)(]|\((?:[^)(]+|\([^)(]*\))*\))*)\)/gi, function(fullMatch, origUrl) {
			// strip quotes (if they exist)
			var unquotedOrigUrl = origUrl
				.trim()
				.replace(/^"(.*)"$/, function(o, $1){ return $1; })
				.replace(/^'(.*)'$/, function(o, $1){ return $1; });
	
			// already a full url? no change
			if (/^(#|data:|http:\/\/|https:\/\/|file:\/\/\/)/i.test(unquotedOrigUrl)) {
			  return fullMatch;
			}
	
			// convert the url to a full url
			var newUrl;
	
			if (unquotedOrigUrl.indexOf("//") === 0) {
			  	//TODO: should we add protocol?
				newUrl = unquotedOrigUrl;
			} else if (unquotedOrigUrl.indexOf("/") === 0) {
				// path should be relative to the base url
				newUrl = baseUrl + unquotedOrigUrl; // already starts with '/'
			} else {
				// path should be relative to current directory
				newUrl = currentDir + unquotedOrigUrl.replace(/^\.\//, ""); // Strip leading './'
			}
	
			// send back the fixed url(...)
			return "url(" + JSON.stringify(newUrl) + ")";
		});
	
		// send back the fixed css
		return fixedCss;
	};
	
	
	/***/ }),
	/* 8 */
	/***/ (function(module, __webpack_exports__, __webpack_require__) {
	
	"use strict";
	Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
	/* harmony export (immutable) */ __webpack_exports__["setupColorPicker"] = setupColorPicker;
	/* harmony export (immutable) */ __webpack_exports__["setup"] = setup;
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__uis_alertDialog__ = __webpack_require__(0);
	/**
	 * UI parts - Browse button.
	 */
	
	
	/**
	 * Setup the color pickers.
	 */
	function setupColorPicker () {
	
	    const colors = [
	        'rgb(255, 128, 0)', 'hsv 100 70 50', 'yellow', 'blanchedalmond',
	        'red', 'green', 'blue', 'violet'
	    ]
	
	    // Setup colorPickers.
	    $('.js-anno-palette').spectrum({
	        showPaletteOnly        : true,
	        showPalette            : true,
	        hideAfterPaletteSelect : true,
	        palette                : [
	            colors.slice(0, Math.floor(colors.length / 2)),
	            colors.slice(Math.floor(colors.length / 2), colors.length)
	        ]
	    })
	    // Set initial color.
	    $('.js-anno-palette').each((i, elm) => {
	        $(elm).spectrum('set', colors[ i % colors.length ])
	    })
	
	    // Setup behavior.
	    $('.js-anno-palette').off('change').on('change', _displayCurrentReferenceAnnotations)
	}
	
	let _displayCurrentReferenceAnnotations
	let _displayCurrentPrimaryAnnotations
	let _getContentFiles
	let _getAnnoFiles
	let _closePDFViewer
	
	/**
	 * Setup the behavior of a Browse Button.
	 */
	function setup ({
	    loadFiles,
	    clearAllAnnotations,
	    displayCurrentReferenceAnnotations,
	    displayCurrentPrimaryAnnotations,
	    getContentFiles,
	    getAnnoFiles,
	    closePDFViewer,
	    callbackLoadedFiles
	}) {
	    _displayCurrentReferenceAnnotations = displayCurrentReferenceAnnotations
	    _displayCurrentPrimaryAnnotations = displayCurrentPrimaryAnnotations
	    _getContentFiles = getContentFiles
	    _getAnnoFiles = getAnnoFiles
	    _closePDFViewer = closePDFViewer
	
	    // Enable to select the same directory twice or more.
	    $('.js-file :file').on('click', ev => {
	        $('input[type="file"]').val(null)
	    })
	
	    $('.js-file :file').on('change', ev => {
	
	        const files = ev.target.files
	
	        let error = isValidDirectorySelect(files)
	        if (error) {
	            __WEBPACK_IMPORTED_MODULE_0__uis_alertDialog__["show"]({ message : error })
	            return
	        }
	
	        loadFiles(files).then(() => {
	
	            // Get current visuals.
	            const current = getCurrentFileNames()
	
	            // Initialize PDF Viewer.
	            clearAllAnnotations()
	
	            // Setup PDF Dropdown.
	            setPDFDropdownList()
	
	            // Setup Anno Dropdown.
	            setAnnoDropdownList()
	
	            // Display a PDF and annotations.
	            restoreBeforeState(current)
	
	            callbackLoadedFiles && callbackLoadedFiles(current)
	        })
	    })
	}
	
	/**
	 * Check whether the directory the user specified is valid.
	 */
	function isValidDirectorySelect (files) {
	
	    // Error, if no contents exits.
	    if (!files || files.length === 0) {
	        return 'No files specified.'
	    }
	
	    // Error, if the user select a file - not a directory.
	    let relativePath = files[0].webkitRelativePath
	    if (!relativePath) {
	        return 'Please select a directory, NOT a file.'
	    }
	
	    // OK.
	    return null
	}
	
	/**
	 * Restore the state before Browse button was clicked.
	 */
	function restoreBeforeState (currentDisplay) {
	
	    let files
	
	    let isPDFClosed = false
	
	    // Restore the check state of a content.
	    files = _getContentFiles().filter(c => c.name === currentDisplay.pdfName)
	    if (files.length > 0) {
	        $('#dropdownPdf .js-text').text(files[0].name)
	        $('#dropdownPdf a').each((index, element) => {
	            let $elm = $(element)
	            if ($elm.find('.js-content-name').text() === currentDisplay.pdfName) {
	                $elm.find('.fa-check').removeClass('no-visible')
	            }
	        })
	
	    } else {
	
	        isPDFClosed = true
	
	        _closePDFViewer()
	    }
	
	    // Restore the check state of a primaryAnno.
	    files = _getAnnoFiles().filter(c => c.name === currentDisplay.primaryAnnotationName)
	    if (files.length > 0 && isPDFClosed === false) {
	        $('#dropdownAnnoPrimary .js-text').text(currentDisplay.primaryAnnotationName)
	        $('#dropdownAnnoPrimary a').each((index, element) => {
	            let $elm = $(element)
	            if ($elm.find('.js-annoname').text() === currentDisplay.primaryAnnotationName) {
	                $elm.find('.fa-check').removeClass('no-visible')
	            }
	        })
	        setTimeout(() => {
	            _displayCurrentPrimaryAnnotations()
	        }, 100)
	    }
	
	    // Restore the check states of referenceAnnos.
	    let names = currentDisplay.referenceAnnotationNames
	    let colors = currentDisplay.referenceAnnotationColors
	    names = names.filter((name, i) => {
	        let found = false
	        let annos = _getAnnoFiles().filter(c => c.name === name)
	        if (annos.length > 0) {
	            $('#dropdownAnnoReference a').each((index, element) => {
	                let $elm = $(element)
	                if ($elm.find('.js-annoname').text() === name) {
	                    $elm.find('.fa-check').removeClass('no-visible')
	                    $elm.find('.js-anno-palette').spectrum('set', colors[i])
	                    found = true
	                }
	            })
	        }
	        return found
	    })
	
	    if (names.length > 0 && isPDFClosed === false) {
	        $('#dropdownAnnoReference .js-text').text(names.join(','))
	        setTimeout(() => {
	            _displayCurrentReferenceAnnotations()
	        }, 500)
	
	    }
	
	}
	
	/**
	 * Get the file names which currently are displayed.
	 */
	function getCurrentFileNames () {
	
	    let text
	
	    // a PDF name.
	    text = $('#dropdownPdf .js-text').text()
	    let pdfName = (text !== getContentDropdownInitialText() ? text : null)
	
	    // a Primary anno.
	    text = $('#dropdownAnnoPrimary .js-text').text()
	    let primaryAnnotationName = (text !== 'Anno File' ? text : null)
	
	    let referenceAnnotationNames = []
	    let referenceAnnotationColors = []
	    $('#dropdownAnnoReference a').each((index, element) => {
	        let $elm = $(element)
	        if ($elm.find('.fa-check').hasClass('no-visible') === false) {
	            let annoName = $elm.find('.js-annoname').text()
	            referenceAnnotationNames.push(annoName)
	            let color = $elm.find('.js-anno-palette').spectrum('get').toHexString()
	            referenceAnnotationColors.push(color)
	        }
	    })
	
	    return {
	        pdfName,
	        primaryAnnotationName,
	        referenceAnnotationNames,
	        referenceAnnotationColors
	    }
	}
	
	/**
	 * Reset and setup the PDF dropdown.
	 */
	function setPDFDropdownList () {
	
	    // Reset the state of the PDF dropdown.
	    $('#dropdownPdf .js-text').text(getContentDropdownInitialText())
	    $('#dropdownPdf li').remove()
	
	    // Create and setup the dropdown menu.
	    const snipets = _getContentFiles().map(content => {
	        return `
	            <li>
	                <a href="#">
	                    <i class="fa fa-check no-visible"></i>&nbsp
	                    <span class="js-content-name">${content.name}</span>
	                </a>
	            </li>
	        `
	    })
	    $('#dropdownPdf ul').append(snipets.join(''))
	}
	
	/**
	 * Reset and setup the primary/reference annotation dropdown.
	 */
	function setAnnoDropdownList () {
	
	    // Reset the UI of primary/reference anno dropdowns.
	    $('#dropdownAnnoPrimary ul').html('')
	    $('#dropdownAnnoReference ul').html('')
	    $('#dropdownAnnoPrimary .js-text').text('Anno File')
	    $('#dropdownAnnoReference .js-text').text('Reference Files')
	
	    // Setup anno / reference dropdown.
	    _getAnnoFiles().forEach(file => {
	
	        let snipet1 = `
	            <li>
	                <a href="#">
	                    <i class="fa fa-check no-visible" aria-hidden="true"></i>
	                    <span class="js-annoname">${file.name}</span>
	                </a>
	            </li>
	        `
	        $('#dropdownAnnoPrimary ul').append(snipet1)
	
	        let snipet2 = `
	            <li>
	                <a href="#">
	                    <i class="fa fa-check no-visible" aria-hidden="true"></i>
	                    <input type="text" name="color" class="js-anno-palette" autocomplete="off">
	                    <span class="js-annoname">${file.name}</span>
	                </a>
	            </li>
	        `
	        $('#dropdownAnnoReference ul').append(snipet2)
	    })
	
	    // Setup color pallets.
	    setupColorPicker()
	}
	
	function getContentDropdownInitialText () {
	    let value = $('#dropdownPdf .js-text').data('initial-text')
	    return (value === undefined || value === '') ? 'PDF File' : value
	}
	
	
	/***/ }),
	/* 9 */
	/***/ (function(module, exports, __webpack_require__) {
	
	// style-loader: Adds some css to the DOM by adding a <style> tag
	
	// load the styles
	var content = __webpack_require__(10);
	if(typeof content === 'string') content = [[module.i, content, '']];
	// Prepare cssTransformation
	var transform;
	
	var options = {}
	options.transform = transform
	// add the styles to the DOM
	var update = __webpack_require__(2)(content, options);
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!../../../node_modules/css-loader/index.js!./index.css", function() {
				var newContent = require("!!../../../node_modules/css-loader/index.js!./index.css");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}
	
	/***/ }),
	/* 10 */
	/***/ (function(module, exports, __webpack_require__) {
	
	exports = module.exports = __webpack_require__(1)(undefined);
	// imports
	
	
	// module
	exports.push([module.i, "/**\n * UI - Alert Dialog.\n */\n\n.alertdialog-danger .modal-header {\n    color: #a94442;\n    background-color: #f2dede;\n    border-color: #ebccd1;\n}\n.alertdialog {\n    margin-top: 200px;\n}\n.alertdialog .modal-dialog {\n    width: 50%;\n}\n.alertdialog .modal-footer {\n    border-top: 0px solid rgba(0,0,0,0);\n}\n", ""]);
	
	// exports
	
	
	/***/ }),
	/* 11 */
	/***/ (function(module, __webpack_exports__, __webpack_require__) {
	
	"use strict";
	Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
	/* harmony export (immutable) */ __webpack_exports__["setup"] = setup;
	/**
	 * UI parts - Content dropdown.
	 */
	
	/**
	 * Setup the dropdown of PDFs.
	 */
	function setup ({
	    initialText,
	    overrideWarningMessage,
	    contentReloadHandler
	}) {
	
	    $('#dropdownPdf .js-text').text(initialText)
	    $('#dropdownPdf .js-text').data('initial-text', initialText)
	
	    // TODO pdfという単語を削除したい..
	
	    $('#dropdownPdf').on('click', 'a', e => {
	
	        const $this = $(e.currentTarget)
	
	        // Get the name of PDF clicked.
	        const pdfName = $this.find('.js-content-name').text()
	
	        // Get the name of PDF currently displayed.
	        const currentPDFName = $('#dropdownPdf .js-text').text()
	
	        // No action, if the current PDF is selected.
	        if (currentPDFName === pdfName) {
	            console.log('Not reload. the contents are same.')
	            return
	        }
	
	        // Confirm to override.
	        if (currentPDFName !== initialText) {
	            if (!window.confirm(overrideWarningMessage)) {
	                return
	            }
	        }
	
	        // Update PDF's name displayed.
	        $('#dropdownPdf .js-text').text(pdfName)
	
	        // Update the dropdown selection.
	        $('#dropdownPdf .fa-check').addClass('no-visible')
	        $this.find('.fa-check').removeClass('no-visible')
	
	        // Reset annotations' dropdowns.
	        resetCheckPrimaryAnnoDropdown()
	        resetCheckReferenceAnnoDropdown()
	
	        // Close dropdown.
	        $('#dropdownPdf').click()
	
	        // Reload Content.
	        contentReloadHandler(pdfName)
	
	        return false
	    })
	}
	
	/**
	 * Reset the primary annotation dropdown selection.
	 */
	function resetCheckPrimaryAnnoDropdown () {
	    $('#dropdownAnnoPrimary .js-text').text('Anno File')
	    $('#dropdownAnnoPrimary .fa-check').addClass('no-visible')
	}
	
	/**
	 * Reset the reference annotation dropdown selection.
	 */
	function resetCheckReferenceAnnoDropdown () {
	    $('#dropdownAnnoReference .js-text').text('Reference Files')
	    $('#dropdownAnnoReference .fa-check').addClass('no-visible')
	}
	
	
	/***/ }),
	/* 12 */
	/***/ (function(module, __webpack_exports__, __webpack_require__) {
	
	"use strict";
	Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
	/* harmony export (immutable) */ __webpack_exports__["setup"] = setup;
	/**
	 * UI parts - Primary anno dropdown.
	 */
	
	/**
	 * Setup a click action of the Primary Annotation Dropdown.
	 */
	function setup ({
	    clearPrimaryAnnotations,
	    displayPrimaryAnnotation
	}) {
	
	    $('#dropdownAnnoPrimary').on('click', 'a', e => {
	
	        let $this = $(e.currentTarget)
	        let annoName = $this.find('.js-annoname').text()
	
	        let currentAnnoName = $('#dropdownAnnoPrimary .js-text').text()
	        if (currentAnnoName === annoName) {
	
	            let userAnswer = window.confirm('Are you sure to clear the current annotations?')
	            if (!userAnswer) {
	                return
	            }
	
	            $('#dropdownAnnoPrimary .fa-check').addClass('no-visible')
	            $('#dropdownAnnoPrimary .js-text').text('Anno File')
	
	            clearPrimaryAnnotations()
	
	            // Close
	            $('#dropdownAnnoPrimary').click()
	
	            return false
	
	        }
	
	        // Confirm to override.
	        if (currentAnnoName !== 'Anno File') {
	            if (!window.confirm('Are you sure to load another Primary Annotation ?')) {
	                return
	            }
	        }
	
	        $('#dropdownAnnoPrimary .js-text').text(annoName)
	
	        $('#dropdownAnnoPrimary .fa-check').addClass('no-visible')
	        $this.find('.fa-check').removeClass('no-visible')
	
	        // Close
	        $('#dropdownAnnoPrimary').click()
	
	        // reload.
	        displayPrimaryAnnotation(annoName)
	
	        return false
	    })
	}
	
	
	/***/ }),
	/* 13 */
	/***/ (function(module, __webpack_exports__, __webpack_require__) {
	
	"use strict";
	Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
	/* harmony export (immutable) */ __webpack_exports__["setup"] = setup;
	/**
	 * UI parts - Reference Annotation Dropdown.
	 */
	
	/**
	 * Setup a click action of the Reference Annotation Dropdown.
	 */
	function setup ({
	    displayReferenceAnnotations
	}) {
	    $('#dropdownAnnoReference').on('click', 'a', e => {
	        let $this = $(e.currentTarget)
	
	        $this.find('.fa-check').toggleClass('no-visible')
	
	        let annoNames = []
	        $('#dropdownAnnoReference a').each((index, element) => {
	            let $elm = $(element)
	            if ($elm.find('.fa-check').hasClass('no-visible') === false) {
	                annoNames.push($elm.find('.js-annoname').text())
	            }
	        })
	        if (annoNames.length > 0) {
	            $('#dropdownAnnoReference .js-text').text(annoNames.join(','))
	        } else {
	            $('#dropdownAnnoReference .js-text').text('Reference Files')
	        }
	
	        // Display reference annotations.
	        displayReferenceAnnotations(annoNames)
	
	        return false
	    })
	}
	
	
	/***/ }),
	/* 14 */
	/***/ (function(module, __webpack_exports__, __webpack_require__) {
	
	"use strict";
	Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
	/* harmony export (immutable) */ __webpack_exports__["setup"] = setup;
	/**
	 * UI parts - Anno List Dropdown.
	 */
	
	/**
	 * Setup the dropdown for Anno list.
	 */
	function setup ({
	    getAnnotations,
	    scrollToAnnotation
	}) {
	    // Show the list of primary annotations.
	    $('#dropdownAnnoList').on('click', () => {
	        // Create html snipets.
	        let elements = getAnnotations().map(a => {
	            let icon
	            if (a.type === 'span') {
	                icon = '<i class="fa fa-pencil"></i>'
	            } else if (a.type === 'relation' && a.direction === 'one-way') {
	                icon = '<i class="fa fa-long-arrow-right"></i>'
	            } else if (a.type === 'relation' && a.direction === 'two-way') {
	                icon = '<i class="fa fa-arrows-h"></i>'
	            } else if (a.type === 'relation' && a.direction === 'link') {
	                icon = '<i class="fa fa-minus"></i>'
	            } else if (a.type === 'area') {
	                icon = '<i class="fa fa-square-o"></i>'
	            }
	
	            let snipet = `
	                <li>
	                    <a href="#" data-id="${a.uuid}">
	                        ${icon}&nbsp&nbsp;<span>${a.text || ''}</span>
	                    </a>
	                </li>
	            `
	            return snipet
	        })
	        $('#dropdownAnnoList ul').html(elements)
	    })
	
	    // Jump to the page that the selected annotation is at.
	    $('#dropdownAnnoList').on('click', 'a', e => {
	        let id = $(e.currentTarget).data('id')
	
	        scrollToAnnotation(id)
	
	        // Close the dropdown.
	        $('#dropdownAnnoList').click()
	    })
	
	    // Update the number of display, at adding / updating/ deleting annotations.
	    function watchPrimaryAnno (e) {
	        $('#dropdownAnnoList .js-count').text(getAnnotations().length)
	    }
	    $(window)
	        .off('annotationrendered annotationUpdated annotationDeleted', watchPrimaryAnno)
	        .on('annotationrendered annotationUpdated annotationDeleted', watchPrimaryAnno)
	}
	
	
	/***/ }),
	/* 15 */
	/***/ (function(module, __webpack_exports__, __webpack_require__) {
	
	"use strict";
	Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
	/* harmony export (immutable) */ __webpack_exports__["setup"] = setup;
	/**
	 * UI parts - Download Button.
	 */
	
	/**
	 * Setup the behavior of a Download Button.
	 */
	function setup ({
	    getAnnotationTOMLString,
	    getCurrentContentName,
	    didDownloadCallback = function () {}
	}) {
	    $('#downloadButton').off('click').on('click', e => {
	        $(e.currentTarget).blur()
	
	        getAnnotationTOMLString().then(annotations => {
	            let blob = new Blob([annotations])
	            let blobURL = window.URL.createObjectURL(blob)
	            let a = document.createElement('a')
	            document.body.appendChild(a) // for firefox working correctly.
	            a.download = _getDownloadFileName(getCurrentContentName)
	            a.href = blobURL
	            a.click()
	            a.parentNode.removeChild(a)
	        })
	
	        didDownloadCallback()
	
	        return false
	    })
	}
	
	/**
	 * Get the file name for download.
	 */
	function _getDownloadFileName (getCurrentContentName) {
	
	    // The name of Primary Annotation.
	    let primaryAnnotationName
	    $('#dropdownAnnoPrimary a').each((index, element) => {
	        let $elm = $(element)
	        if ($elm.find('.fa-check').hasClass('no-visible') === false) {
	            primaryAnnotationName = $elm.find('.js-annoname').text()
	        }
	    })
	    if (primaryAnnotationName) {
	        return primaryAnnotationName
	    }
	
	    // The name of Content.
	    let pdfFileName = getCurrentContentName()
	    let annoName = pdfFileName.replace(/\.pdf$/i, '.anno')
	    return annoName
	}
	
	
	/***/ }),
	/* 16 */
	/***/ (function(module, __webpack_exports__, __webpack_require__) {
	
	"use strict";
	Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
	/* harmony export (immutable) */ __webpack_exports__["setup"] = setup;
	/**
	 * UI parts - Anno Tools for RectAnnotation.
	 */
	function setup ({ enableRect, disableRect }) {
	    // Rect annotation button.
	    $('.js-tool-btn-rect').off('click').on('click', (e) => {
	        let $btn = $(e.currentTarget)
	
	        // Make disable.
	        if ($btn.hasClass('active')) {
	            window.currentAnnoToolType = 'view'
	            $btn.removeClass('active').blur()
	            disableRect()
	
	        // Make enable.
	        } else {
	            window.currentAnnoToolType = 'rect'
	            $btn.addClass('active')
	            enableRect()
	        }
	
	        return false
	    })
	}
	
	
	/***/ }),
	/* 17 */
	/***/ (function(module, __webpack_exports__, __webpack_require__) {
	
	"use strict";
	Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
	/* harmony export (immutable) */ __webpack_exports__["setup"] = setup;
	/**
	 * UI parts - Anno Tools for RelationAnnotation (one-way / two-way / link).
	 */
	function setup ({ createRelAnnotation }) {
	    // Relation annotation button.
	    $('.js-tool-btn-rel').off('click').on('click', e => {
	        const $button = $(e.currentTarget)
	        const type = $button.data('type')
	        createRelAnnotation(type)
	        $button.blur()
	    })
	}
	
	
	/***/ }),
	/* 18 */
	/***/ (function(module, __webpack_exports__, __webpack_require__) {
	
	"use strict";
	Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
	/* harmony export (immutable) */ __webpack_exports__["setup"] = setup;
	/**
	 * UI parts - Anno Tools for SpanAnnotation.
	 */
	function setup ({ createSpanAnnotation }) {
	    $('.js-tool-btn-span').off('click').on('click', e => {
	        $(e.currentTarget).blur()
	        createSpanAnnotation()
	    })
	}
	
	
	/***/ }),
	/* 19 */
	/***/ (function(module, __webpack_exports__, __webpack_require__) {
	
	"use strict";
	Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
	/* harmony export (immutable) */ __webpack_exports__["setup"] = setup;
	/* harmony export (immutable) */ __webpack_exports__["enable"] = enable;
	/* harmony export (immutable) */ __webpack_exports__["disable"] = disable;
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_toml__ = __webpack_require__(22);
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_toml___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_toml__);
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__utils__ = __webpack_require__(3);
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__uis_alertDialog__ = __webpack_require__(0);
	/**
	 * UI parts - Input Label.
	 */
	__webpack_require__(20)
	
	
	
	// import packageJson from '../../../package.json'
	
	
	
	// LocalStorage key to save label data.
	const LSKEY_LABEL_LIST = 'pdfanno-label-list'
	
	let $inputLabel
	window.addEventListener('DOMContentLoaded', () => {
	    $inputLabel = $('#inputLabel')
	})
	
	let _blurListener
	
	let currentUUID
	
	let _getSelectedAnnotations
	let _saveAnnotationText
	let _createSpanAnnotation
	let _createRelAnnotation
	
	function setup ({
	    getSelectedAnnotations,
	    saveAnnotationText,
	    createSpanAnnotation,
	    createRelAnnotation
	}) {
	    _getSelectedAnnotations = getSelectedAnnotations
	    _saveAnnotationText = saveAnnotationText
	    _createSpanAnnotation = createSpanAnnotation
	    _createRelAnnotation = createRelAnnotation
	
	    // Start to listen window events.
	    listenWindowEvents()
	
	    // Set add button behavior.
	    setupLabelAddButton()
	
	    // Set trash button behavior.
	    setupLabelTrashButton()
	
	    // Set the action when a label is clicked.
	    setupLabelText()
	
	    // Set tab behavior.
	    seupTabClick()
	
	    // Set import/export link behavior.
	    setupImportExportLink()
	}
	
	// The tab name active.
	let currentTab = 'span'
	
	// Setup the action when a tab is clicked.
	function seupTabClick () {
	    $('.js-label-tab').on('click', e => {
	        const type = $(e.currentTarget).data('type')
	        let d = getLabelListData()
	        const labelObject = d[type] || {}
	        let labels
	        if (labelObject.labels === undefined) {
	            labels = [(type === 'span' ? 'span1' : 'relation1')]
	        } else {
	            labels = labelObject.labels
	        }
	
	        labelObject.labels = labels
	        d[type] = labelObject
	        saveLabelListData(d)
	
	        currentTab = type
	
	        let $ul = $(`<ul class="tab-pane active label-list" data-type="${type}"/>`)
	        labels.forEach((label, index) => {
	            $ul.append(`
	                <li>
	                    <div class="label-list__btn js-label-trash" data-index="${index}"><i class="fa fa-trash-o fa-2x"></i></div>
	                    <div class="label-list__text js-label">${label}</div>
	                </li>
	            `)
	        })
	        $ul.append(`
	            <li>
	                <div class="label-list__btn js-add-label-button"><i class="fa fa-plus fa-2x"></i></div>
	                <input type="text" class="label-list__input">
	            </li>
	        `)
	        $('.js-label-tab-content').html($ul)
	    })
	
	    // Setup the initial tab content.
	    $('.js-label-tab[data-type="span"]').click()
	}
	
	function setupLabelAddButton () {
	    $('.js-label-tab-content').on('click', '.js-add-label-button', e => {
	        let $this = $(e.currentTarget)
	        let text = $this.parent().find('input').val().trim()
	        let type = $this.parents('[data-type]').data('type')
	
	        if (!text) {
	            text = '&nbsp;'
	        }
	
	        let d = getLabelListData()
	        let labelObject = d[type] || { labels : [] }
	        labelObject.labels.push(text)
	        d[type] = labelObject
	        saveLabelListData(d)
	
	        // Re-render.
	        $(`.js-label-tab[data-type="${currentTab}"]`).click()
	    })
	}
	
	function setupLabelTrashButton () {
	    $('.js-label-tab-content').on('click', '.js-label-trash', e => {
	        const $this = $(e.currentTarget)
	        const idx = $this.data('index')
	        const type = $this.parents('[data-type]').data('type')
	
	        let d = getLabelListData()
	        let labelObject = d[type] || { labels : [] }
	        labelObject.labels = labelObject.labels.slice(0, idx).concat(labelObject.labels.slice(idx + 1, labelObject.labels.length))
	        d[type] = labelObject
	        saveLabelListData(d)
	
	        // Re-render.
	        $(`.js-label-tab[data-type="${currentTab}"]`).click()
	    })
	}
	
	function setupLabelText () {
	    $('.js-label-tab-content').on('click', '.js-label', e => {
	        let $this = $(e.currentTarget)
	        let text = $this.text().trim().replace(/&nbsp;/g, '')
	        let type = $this.parents('[data-type]').data('type')
	
	        if (text === '<Empty Label>') {
	            text = ''
	        }
	
	        if (type === 'span') {
	            _createSpanAnnotation({ text })
	        } else if (type === 'one-way' || type === 'two-way' || type === 'link') {
	            _createRelAnnotation({ type, text })
	        }
	    })
	}
	
	function getLabelListData () {
	    return JSON.parse(localStorage.getItem(LSKEY_LABEL_LIST) || '{}')
	}
	
	function saveLabelListData (data) {
	    localStorage.setItem(LSKEY_LABEL_LIST, JSON.stringify(data))
	}
	
	function setupImportExportLink () {
	    $('.js-export-label').on('click', () => {
	        let data = getLabelListData()
	
	        // Transform '&nbsp;' to white space.
	        Object.keys(data).forEach(key => {
	            let labelObject = data[key]
	            let labels = (labelObject.labels || []).map(label => {
	                if (label === '&nbsp;') {
	                    label = ''
	                }
	                return label
	            })
	            labelObject.labels = labels
	        })
	
	        // Conver to TOML style.
	        const toml = Object(__WEBPACK_IMPORTED_MODULE_1__utils__["tomlString"])(data)
	        console.log(toml)
	
	        // Download.
	        let blob = new Blob([toml])
	        let blobURL = window.URL.createObjectURL(blob)
	        let a = document.createElement('a')
	        document.body.appendChild(a) // for firefox working correctly.
	        a.download = 'pdfanno.conf'
	        a.href = blobURL
	        a.click()
	        a.parentNode.removeChild(a)
	    })
	
	    $('.js-import-label').on('click', () => {
	        $('.js-import-file').val(null).click()
	    })
	    $('.js-import-file').on('change', ev => {
	        if (ev.target.files.length === 0) {
	            return
	        }
	
	        const file = ev.target.files[0]
	
	        if (!window.confirm('Are you sure to load labels?')) {
	            return
	        }
	
	        let fileReader = new FileReader()
	        fileReader.onload = event => {
	            const tomlString = event.target.result
	            try {
	                const labelData = __WEBPACK_IMPORTED_MODULE_0_toml___default.a.parse(tomlString)
	
	                // whitespace to '&nbsp'
	                Object.keys(labelData).forEach(key => {
	                    let labelObject = labelData[key]
	                    let labels = (labelObject.labels || []).map(label => {
	                        if (label === '') {
	                            label = '&nbsp;'
	                        }
	                        return label
	                    })
	                    labelObject.labels = labels
	                })
	
	                saveLabelListData(labelData)
	                // Re-render.
	                $(`.js-label-tab[data-type="${currentTab}"]`).click()
	            } catch (e) {
	                console.log('ERROR:', e)
	                console.log('TOML:\n', tomlString)
	                __WEBPACK_IMPORTED_MODULE_2__uis_alertDialog__["show"]({ message : 'ERROR: cannot load the label file.' })
	                return
	            }
	        }
	        fileReader.readAsText(file)
	    })
	}
	
	function enable ({ uuid, text, disable = false, autoFocus = false, blurListener = null }) {
	    console.log('enableInputLabel:', uuid, text)
	
	    currentUUID = uuid
	
	    if (_blurListener) {
	        _blurListener()
	        _blurListener = null
	        console.log('old _blurListener is called.')
	    }
	
	    $inputLabel
	        .attr('disabled', 'disabled')
	        .val(text || '')
	        .off('blur')
	        .off('keyup')
	
	    if (disable === false) {
	        $inputLabel
	            .removeAttr('disabled')
	            .on('keyup', () => {
	                saveText(uuid)
	            })
	    }
	
	    if (autoFocus) {
	        $inputLabel.focus()
	    }
	
	    $inputLabel.on('blur', () => {
	        if (blurListener) {
	            blurListener()
	            _blurListener = blurListener
	        }
	        saveText(uuid)
	    })
	}
	
	function disable () {
	    currentUUID = null
	    $inputLabel
	        .attr('disabled', 'disabled')
	        .val('')
	}
	
	function treatAnnotationDeleted ({ uuid }) {
	    if (currentUUID === uuid) {
	        disable(...arguments)
	    }
	}
	
	function handleAnnotationHoverIn (annotation) {
	    if (_getSelectedAnnotations().length === 0) {
	        enable({ uuid : annotation.uuid, text : annotation.text, disable : true })
	    }
	}
	
	function handleAnnotationHoverOut (annotation) {
	    if (_getSelectedAnnotations().length === 0) {
	        disable()
	    }
	}
	
	function handleAnnotationSelected (annotation) {
	    if (_getSelectedAnnotations().length === 1) {
	        enable({ uuid : annotation.uuid, text : annotation.text })
	    } else {
	        disable()
	    }
	}
	
	function handleAnnotationDeselected () {
	    const annos = _getSelectedAnnotations()
	    if (annos.length === 1) {
	        enable({ uuid : annos[0].uuid, text : annos[0].text })
	    } else {
	        disable()
	    }
	}
	
	function saveText (uuid) {
	    const text = $inputLabel.val() || ''
	    _saveAnnotationText(uuid, text)
	}
	
	/**
	 * Set window event listeners.
	 */
	function listenWindowEvents () {
	    // enable text input.
	    window.addEventListener('enableTextInput', e => {
	        enable(e.detail)
	    })
	
	    // disable text input.
	    window.addEventListener('disappearTextInput', e => {
	        disable(e.detail)
	    })
	
	    // handle annotation deleted.
	    window.addEventListener('annotationDeleted', e => {
	        treatAnnotationDeleted(e.detail)
	    })
	
	    // handle annotation hoverIn.
	    window.addEventListener('annotationHoverIn', e => {
	        handleAnnotationHoverIn(e.detail)
	    })
	
	    // handle annotation hoverOut.
	    window.addEventListener('annotationHoverOut', e => {
	        handleAnnotationHoverOut(e.detail)
	    })
	
	    // handle annotation selected.
	    window.addEventListener('annotationSelected', e => {
	        handleAnnotationSelected(e.detail)
	    })
	
	    // handle annotation deselected.
	    window.addEventListener('annotationDeselected', () => {
	        handleAnnotationDeselected()
	    })
	}
	
	
	/***/ }),
	/* 20 */
	/***/ (function(module, exports, __webpack_require__) {
	
	// style-loader: Adds some css to the DOM by adding a <style> tag
	
	// load the styles
	var content = __webpack_require__(21);
	if(typeof content === 'string') content = [[module.i, content, '']];
	// Prepare cssTransformation
	var transform;
	
	var options = {}
	options.transform = transform
	// add the styles to the DOM
	var update = __webpack_require__(2)(content, options);
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!../../../node_modules/css-loader/index.js!./index.css", function() {
				var newContent = require("!!../../../node_modules/css-loader/index.js!./index.css");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}
	
	/***/ }),
	/* 21 */
	/***/ (function(module, exports, __webpack_require__) {
	
	exports = module.exports = __webpack_require__(1)(undefined);
	// imports
	
	
	// module
	exports.push([module.i, "\n.inputLabel {\n    font-size: 20px;\n}\n\n/**\n * Label list.\n */\n.label-list {}\n.label-list li {\n    display: flex;\n    align-items: center;\n    padding: 0 10px;\n    border-bottom: 1px solid #eee;\n}\n.label-list li:last-child {\n    padding-top: 5px;\n    padding-bottom: 5px;\n    border-bottom: 0 solid rgba(0,0,0,0);\n}\n.label-list__btn {\n    width: 40px;\n    height: 40px;\n    line-height: 50px;\n    font-size: 16px;\n    text-align: center;\n    cursor: pointer;\n    transition: all 1.5 ease-in-out;\n    border-radius: 3px;\n    background-color: white;\n    margin-right: 20px;\n    flex: 0 0 30px;\n}\n.label-list__btn:hover,\n.label-list__text:hover {\n    box-shadow: 0 1px 3px rgba(0,0,0,.3);\n}\n.label-list__text {\n    flex-grow: 1;\n    cursor: pointer;\n    padding: 2px;\n    font-size: 20px;\n}\n.label-list__input {\n    flex-grow: 1;\n    padding: 2px 5px;\n}\n", ""]);
	
	// exports
	
	
	/***/ }),
	/* 22 */
	/***/ (function(module, exports, __webpack_require__) {
	
	var parser = __webpack_require__(23);
	var compiler = __webpack_require__(24);
	
	module.exports = {
	  parse: function(input) {
	    var nodes = parser.parse(input.toString());
	    return compiler.compile(nodes);
	  }
	};
	
	
	/***/ }),
	/* 23 */
	/***/ (function(module, exports) {
	
	module.exports = (function() {
	  /*
	   * Generated by PEG.js 0.8.0.
	   *
	   * http://pegjs.majda.cz/
	   */
	
	  function peg$subclass(child, parent) {
	    function ctor() { this.constructor = child; }
	    ctor.prototype = parent.prototype;
	    child.prototype = new ctor();
	  }
	
	  function SyntaxError(message, expected, found, offset, line, column) {
	    this.message  = message;
	    this.expected = expected;
	    this.found    = found;
	    this.offset   = offset;
	    this.line     = line;
	    this.column   = column;
	
	    this.name     = "SyntaxError";
	  }
	
	  peg$subclass(SyntaxError, Error);
	
	  function parse(input) {
	    var options = arguments.length > 1 ? arguments[1] : {},
	
	        peg$FAILED = {},
	
	        peg$startRuleFunctions = { start: peg$parsestart },
	        peg$startRuleFunction  = peg$parsestart,
	
	        peg$c0 = [],
	        peg$c1 = function() { return nodes },
	        peg$c2 = peg$FAILED,
	        peg$c3 = "#",
	        peg$c4 = { type: "literal", value: "#", description: "\"#\"" },
	        peg$c5 = void 0,
	        peg$c6 = { type: "any", description: "any character" },
	        peg$c7 = "[",
	        peg$c8 = { type: "literal", value: "[", description: "\"[\"" },
	        peg$c9 = "]",
	        peg$c10 = { type: "literal", value: "]", description: "\"]\"" },
	        peg$c11 = function(name) { addNode(node('ObjectPath', name, line, column)) },
	        peg$c12 = function(name) { addNode(node('ArrayPath', name, line, column)) },
	        peg$c13 = function(parts, name) { return parts.concat(name) },
	        peg$c14 = function(name) { return [name] },
	        peg$c15 = function(name) { return name },
	        peg$c16 = ".",
	        peg$c17 = { type: "literal", value: ".", description: "\".\"" },
	        peg$c18 = "=",
	        peg$c19 = { type: "literal", value: "=", description: "\"=\"" },
	        peg$c20 = function(key, value) { addNode(node('Assign', value, line, column, key)) },
	        peg$c21 = function(chars) { return chars.join('') },
	        peg$c22 = function(node) { return node.value },
	        peg$c23 = "\"\"\"",
	        peg$c24 = { type: "literal", value: "\"\"\"", description: "\"\\\"\\\"\\\"\"" },
	        peg$c25 = null,
	        peg$c26 = function(chars) { return node('String', chars.join(''), line, column) },
	        peg$c27 = "\"",
	        peg$c28 = { type: "literal", value: "\"", description: "\"\\\"\"" },
	        peg$c29 = "'''",
	        peg$c30 = { type: "literal", value: "'''", description: "\"'''\"" },
	        peg$c31 = "'",
	        peg$c32 = { type: "literal", value: "'", description: "\"'\"" },
	        peg$c33 = function(char) { return char },
	        peg$c34 = function(char) { return char},
	        peg$c35 = "\\",
	        peg$c36 = { type: "literal", value: "\\", description: "\"\\\\\"" },
	        peg$c37 = function() { return '' },
	        peg$c38 = "e",
	        peg$c39 = { type: "literal", value: "e", description: "\"e\"" },
	        peg$c40 = "E",
	        peg$c41 = { type: "literal", value: "E", description: "\"E\"" },
	        peg$c42 = function(left, right) { return node('Float', parseFloat(left + 'e' + right), line, column) },
	        peg$c43 = function(text) { return node('Float', parseFloat(text), line, column) },
	        peg$c44 = "+",
	        peg$c45 = { type: "literal", value: "+", description: "\"+\"" },
	        peg$c46 = function(digits) { return digits.join('') },
	        peg$c47 = "-",
	        peg$c48 = { type: "literal", value: "-", description: "\"-\"" },
	        peg$c49 = function(digits) { return '-' + digits.join('') },
	        peg$c50 = function(text) { return node('Integer', parseInt(text, 10), line, column) },
	        peg$c51 = "true",
	        peg$c52 = { type: "literal", value: "true", description: "\"true\"" },
	        peg$c53 = function() { return node('Boolean', true, line, column) },
	        peg$c54 = "false",
	        peg$c55 = { type: "literal", value: "false", description: "\"false\"" },
	        peg$c56 = function() { return node('Boolean', false, line, column) },
	        peg$c57 = function() { return node('Array', [], line, column) },
	        peg$c58 = function(value) { return node('Array', value ? [value] : [], line, column) },
	        peg$c59 = function(values) { return node('Array', values, line, column) },
	        peg$c60 = function(values, value) { return node('Array', values.concat(value), line, column) },
	        peg$c61 = function(value) { return value },
	        peg$c62 = ",",
	        peg$c63 = { type: "literal", value: ",", description: "\",\"" },
	        peg$c64 = "{",
	        peg$c65 = { type: "literal", value: "{", description: "\"{\"" },
	        peg$c66 = "}",
	        peg$c67 = { type: "literal", value: "}", description: "\"}\"" },
	        peg$c68 = function(values) { return node('InlineTable', values, line, column) },
	        peg$c69 = function(key, value) { return node('InlineTableValue', value, line, column, key) },
	        peg$c70 = function(digits) { return "." + digits },
	        peg$c71 = function(date) { return  date.join('') },
	        peg$c72 = ":",
	        peg$c73 = { type: "literal", value: ":", description: "\":\"" },
	        peg$c74 = function(time) { return time.join('') },
	        peg$c75 = "T",
	        peg$c76 = { type: "literal", value: "T", description: "\"T\"" },
	        peg$c77 = "Z",
	        peg$c78 = { type: "literal", value: "Z", description: "\"Z\"" },
	        peg$c79 = function(date, time) { return node('Date', new Date(date + "T" + time + "Z"), line, column) },
	        peg$c80 = function(date, time) { return node('Date', new Date(date + "T" + time), line, column) },
	        peg$c81 = /^[ \t]/,
	        peg$c82 = { type: "class", value: "[ \\t]", description: "[ \\t]" },
	        peg$c83 = "\n",
	        peg$c84 = { type: "literal", value: "\n", description: "\"\\n\"" },
	        peg$c85 = "\r",
	        peg$c86 = { type: "literal", value: "\r", description: "\"\\r\"" },
	        peg$c87 = /^[0-9a-f]/i,
	        peg$c88 = { type: "class", value: "[0-9a-f]i", description: "[0-9a-f]i" },
	        peg$c89 = /^[0-9]/,
	        peg$c90 = { type: "class", value: "[0-9]", description: "[0-9]" },
	        peg$c91 = "_",
	        peg$c92 = { type: "literal", value: "_", description: "\"_\"" },
	        peg$c93 = function() { return "" },
	        peg$c94 = /^[A-Za-z0-9_\-]/,
	        peg$c95 = { type: "class", value: "[A-Za-z0-9_\\-]", description: "[A-Za-z0-9_\\-]" },
	        peg$c96 = function(d) { return d.join('') },
	        peg$c97 = "\\\"",
	        peg$c98 = { type: "literal", value: "\\\"", description: "\"\\\\\\\"\"" },
	        peg$c99 = function() { return '"'  },
	        peg$c100 = "\\\\",
	        peg$c101 = { type: "literal", value: "\\\\", description: "\"\\\\\\\\\"" },
	        peg$c102 = function() { return '\\' },
	        peg$c103 = "\\b",
	        peg$c104 = { type: "literal", value: "\\b", description: "\"\\\\b\"" },
	        peg$c105 = function() { return '\b' },
	        peg$c106 = "\\t",
	        peg$c107 = { type: "literal", value: "\\t", description: "\"\\\\t\"" },
	        peg$c108 = function() { return '\t' },
	        peg$c109 = "\\n",
	        peg$c110 = { type: "literal", value: "\\n", description: "\"\\\\n\"" },
	        peg$c111 = function() { return '\n' },
	        peg$c112 = "\\f",
	        peg$c113 = { type: "literal", value: "\\f", description: "\"\\\\f\"" },
	        peg$c114 = function() { return '\f' },
	        peg$c115 = "\\r",
	        peg$c116 = { type: "literal", value: "\\r", description: "\"\\\\r\"" },
	        peg$c117 = function() { return '\r' },
	        peg$c118 = "\\U",
	        peg$c119 = { type: "literal", value: "\\U", description: "\"\\\\U\"" },
	        peg$c120 = function(digits) { return convertCodePoint(digits.join('')) },
	        peg$c121 = "\\u",
	        peg$c122 = { type: "literal", value: "\\u", description: "\"\\\\u\"" },
	
	        peg$currPos          = 0,
	        peg$reportedPos      = 0,
	        peg$cachedPos        = 0,
	        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
	        peg$maxFailPos       = 0,
	        peg$maxFailExpected  = [],
	        peg$silentFails      = 0,
	
	        peg$cache = {},
	        peg$result;
	
	    if ("startRule" in options) {
	      if (!(options.startRule in peg$startRuleFunctions)) {
	        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
	      }
	
	      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
	    }
	
	    function text() {
	      return input.substring(peg$reportedPos, peg$currPos);
	    }
	
	    function offset() {
	      return peg$reportedPos;
	    }
	
	    function line() {
	      return peg$computePosDetails(peg$reportedPos).line;
	    }
	
	    function column() {
	      return peg$computePosDetails(peg$reportedPos).column;
	    }
	
	    function expected(description) {
	      throw peg$buildException(
	        null,
	        [{ type: "other", description: description }],
	        peg$reportedPos
	      );
	    }
	
	    function error(message) {
	      throw peg$buildException(message, null, peg$reportedPos);
	    }
	
	    function peg$computePosDetails(pos) {
	      function advance(details, startPos, endPos) {
	        var p, ch;
	
	        for (p = startPos; p < endPos; p++) {
	          ch = input.charAt(p);
	          if (ch === "\n") {
	            if (!details.seenCR) { details.line++; }
	            details.column = 1;
	            details.seenCR = false;
	          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
	            details.line++;
	            details.column = 1;
	            details.seenCR = true;
	          } else {
	            details.column++;
	            details.seenCR = false;
	          }
	        }
	      }
	
	      if (peg$cachedPos !== pos) {
	        if (peg$cachedPos > pos) {
	          peg$cachedPos = 0;
	          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
	        }
	        advance(peg$cachedPosDetails, peg$cachedPos, pos);
	        peg$cachedPos = pos;
	      }
	
	      return peg$cachedPosDetails;
	    }
	
	    function peg$fail(expected) {
	      if (peg$currPos < peg$maxFailPos) { return; }
	
	      if (peg$currPos > peg$maxFailPos) {
	        peg$maxFailPos = peg$currPos;
	        peg$maxFailExpected = [];
	      }
	
	      peg$maxFailExpected.push(expected);
	    }
	
	    function peg$buildException(message, expected, pos) {
	      function cleanupExpected(expected) {
	        var i = 1;
	
	        expected.sort(function(a, b) {
	          if (a.description < b.description) {
	            return -1;
	          } else if (a.description > b.description) {
	            return 1;
	          } else {
	            return 0;
	          }
	        });
	
	        while (i < expected.length) {
	          if (expected[i - 1] === expected[i]) {
	            expected.splice(i, 1);
	          } else {
	            i++;
	          }
	        }
	      }
	
	      function buildMessage(expected, found) {
	        function stringEscape(s) {
	          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }
	
	          return s
	            .replace(/\\/g,   '\\\\')
	            .replace(/"/g,    '\\"')
	            .replace(/\x08/g, '\\b')
	            .replace(/\t/g,   '\\t')
	            .replace(/\n/g,   '\\n')
	            .replace(/\f/g,   '\\f')
	            .replace(/\r/g,   '\\r')
	            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
	            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
	            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
	            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
	        }
	
	        var expectedDescs = new Array(expected.length),
	            expectedDesc, foundDesc, i;
	
	        for (i = 0; i < expected.length; i++) {
	          expectedDescs[i] = expected[i].description;
	        }
	
	        expectedDesc = expected.length > 1
	          ? expectedDescs.slice(0, -1).join(", ")
	              + " or "
	              + expectedDescs[expected.length - 1]
	          : expectedDescs[0];
	
	        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";
	
	        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
	      }
	
	      var posDetails = peg$computePosDetails(pos),
	          found      = pos < input.length ? input.charAt(pos) : null;
	
	      if (expected !== null) {
	        cleanupExpected(expected);
	      }
	
	      return new SyntaxError(
	        message !== null ? message : buildMessage(expected, found),
	        expected,
	        found,
	        pos,
	        posDetails.line,
	        posDetails.column
	      );
	    }
	
	    function peg$parsestart() {
	      var s0, s1, s2;
	
	      var key    = peg$currPos * 49 + 0,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = [];
	      s2 = peg$parseline();
	      while (s2 !== peg$FAILED) {
	        s1.push(s2);
	        s2 = peg$parseline();
	      }
	      if (s1 !== peg$FAILED) {
	        peg$reportedPos = s0;
	        s1 = peg$c1();
	      }
	      s0 = s1;
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseline() {
	      var s0, s1, s2, s3, s4, s5, s6;
	
	      var key    = peg$currPos * 49 + 1,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = [];
	      s2 = peg$parseS();
	      while (s2 !== peg$FAILED) {
	        s1.push(s2);
	        s2 = peg$parseS();
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parseexpression();
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parseS();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parseS();
	          }
	          if (s3 !== peg$FAILED) {
	            s4 = [];
	            s5 = peg$parsecomment();
	            while (s5 !== peg$FAILED) {
	              s4.push(s5);
	              s5 = peg$parsecomment();
	            }
	            if (s4 !== peg$FAILED) {
	              s5 = [];
	              s6 = peg$parseNL();
	              if (s6 !== peg$FAILED) {
	                while (s6 !== peg$FAILED) {
	                  s5.push(s6);
	                  s6 = peg$parseNL();
	                }
	              } else {
	                s5 = peg$c2;
	              }
	              if (s5 === peg$FAILED) {
	                s5 = peg$parseEOF();
	              }
	              if (s5 !== peg$FAILED) {
	                s1 = [s1, s2, s3, s4, s5];
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = [];
	        s2 = peg$parseS();
	        if (s2 !== peg$FAILED) {
	          while (s2 !== peg$FAILED) {
	            s1.push(s2);
	            s2 = peg$parseS();
	          }
	        } else {
	          s1 = peg$c2;
	        }
	        if (s1 !== peg$FAILED) {
	          s2 = [];
	          s3 = peg$parseNL();
	          if (s3 !== peg$FAILED) {
	            while (s3 !== peg$FAILED) {
	              s2.push(s3);
	              s3 = peg$parseNL();
	            }
	          } else {
	            s2 = peg$c2;
	          }
	          if (s2 === peg$FAILED) {
	            s2 = peg$parseEOF();
	          }
	          if (s2 !== peg$FAILED) {
	            s1 = [s1, s2];
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	        if (s0 === peg$FAILED) {
	          s0 = peg$parseNL();
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseexpression() {
	      var s0;
	
	      var key    = peg$currPos * 49 + 2,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$parsecomment();
	      if (s0 === peg$FAILED) {
	        s0 = peg$parsepath();
	        if (s0 === peg$FAILED) {
	          s0 = peg$parsetablearray();
	          if (s0 === peg$FAILED) {
	            s0 = peg$parseassignment();
	          }
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsecomment() {
	      var s0, s1, s2, s3, s4, s5;
	
	      var key    = peg$currPos * 49 + 3,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 35) {
	        s1 = peg$c3;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c4); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = [];
	        s3 = peg$currPos;
	        s4 = peg$currPos;
	        peg$silentFails++;
	        s5 = peg$parseNL();
	        if (s5 === peg$FAILED) {
	          s5 = peg$parseEOF();
	        }
	        peg$silentFails--;
	        if (s5 === peg$FAILED) {
	          s4 = peg$c5;
	        } else {
	          peg$currPos = s4;
	          s4 = peg$c2;
	        }
	        if (s4 !== peg$FAILED) {
	          if (input.length > peg$currPos) {
	            s5 = input.charAt(peg$currPos);
	            peg$currPos++;
	          } else {
	            s5 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c6); }
	          }
	          if (s5 !== peg$FAILED) {
	            s4 = [s4, s5];
	            s3 = s4;
	          } else {
	            peg$currPos = s3;
	            s3 = peg$c2;
	          }
	        } else {
	          peg$currPos = s3;
	          s3 = peg$c2;
	        }
	        while (s3 !== peg$FAILED) {
	          s2.push(s3);
	          s3 = peg$currPos;
	          s4 = peg$currPos;
	          peg$silentFails++;
	          s5 = peg$parseNL();
	          if (s5 === peg$FAILED) {
	            s5 = peg$parseEOF();
	          }
	          peg$silentFails--;
	          if (s5 === peg$FAILED) {
	            s4 = peg$c5;
	          } else {
	            peg$currPos = s4;
	            s4 = peg$c2;
	          }
	          if (s4 !== peg$FAILED) {
	            if (input.length > peg$currPos) {
	              s5 = input.charAt(peg$currPos);
	              peg$currPos++;
	            } else {
	              s5 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c6); }
	            }
	            if (s5 !== peg$FAILED) {
	              s4 = [s4, s5];
	              s3 = s4;
	            } else {
	              peg$currPos = s3;
	              s3 = peg$c2;
	            }
	          } else {
	            peg$currPos = s3;
	            s3 = peg$c2;
	          }
	        }
	        if (s2 !== peg$FAILED) {
	          s1 = [s1, s2];
	          s0 = s1;
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsepath() {
	      var s0, s1, s2, s3, s4, s5;
	
	      var key    = peg$currPos * 49 + 4,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 91) {
	        s1 = peg$c7;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c8); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = [];
	        s3 = peg$parseS();
	        while (s3 !== peg$FAILED) {
	          s2.push(s3);
	          s3 = peg$parseS();
	        }
	        if (s2 !== peg$FAILED) {
	          s3 = peg$parsetable_key();
	          if (s3 !== peg$FAILED) {
	            s4 = [];
	            s5 = peg$parseS();
	            while (s5 !== peg$FAILED) {
	              s4.push(s5);
	              s5 = peg$parseS();
	            }
	            if (s4 !== peg$FAILED) {
	              if (input.charCodeAt(peg$currPos) === 93) {
	                s5 = peg$c9;
	                peg$currPos++;
	              } else {
	                s5 = peg$FAILED;
	                if (peg$silentFails === 0) { peg$fail(peg$c10); }
	              }
	              if (s5 !== peg$FAILED) {
	                peg$reportedPos = s0;
	                s1 = peg$c11(s3);
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsetablearray() {
	      var s0, s1, s2, s3, s4, s5, s6, s7;
	
	      var key    = peg$currPos * 49 + 5,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 91) {
	        s1 = peg$c7;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c8); }
	      }
	      if (s1 !== peg$FAILED) {
	        if (input.charCodeAt(peg$currPos) === 91) {
	          s2 = peg$c7;
	          peg$currPos++;
	        } else {
	          s2 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c8); }
	        }
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parseS();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parseS();
	          }
	          if (s3 !== peg$FAILED) {
	            s4 = peg$parsetable_key();
	            if (s4 !== peg$FAILED) {
	              s5 = [];
	              s6 = peg$parseS();
	              while (s6 !== peg$FAILED) {
	                s5.push(s6);
	                s6 = peg$parseS();
	              }
	              if (s5 !== peg$FAILED) {
	                if (input.charCodeAt(peg$currPos) === 93) {
	                  s6 = peg$c9;
	                  peg$currPos++;
	                } else {
	                  s6 = peg$FAILED;
	                  if (peg$silentFails === 0) { peg$fail(peg$c10); }
	                }
	                if (s6 !== peg$FAILED) {
	                  if (input.charCodeAt(peg$currPos) === 93) {
	                    s7 = peg$c9;
	                    peg$currPos++;
	                  } else {
	                    s7 = peg$FAILED;
	                    if (peg$silentFails === 0) { peg$fail(peg$c10); }
	                  }
	                  if (s7 !== peg$FAILED) {
	                    peg$reportedPos = s0;
	                    s1 = peg$c12(s4);
	                    s0 = s1;
	                  } else {
	                    peg$currPos = s0;
	                    s0 = peg$c2;
	                  }
	                } else {
	                  peg$currPos = s0;
	                  s0 = peg$c2;
	                }
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsetable_key() {
	      var s0, s1, s2;
	
	      var key    = peg$currPos * 49 + 6,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = [];
	      s2 = peg$parsedot_ended_table_key_part();
	      if (s2 !== peg$FAILED) {
	        while (s2 !== peg$FAILED) {
	          s1.push(s2);
	          s2 = peg$parsedot_ended_table_key_part();
	        }
	      } else {
	        s1 = peg$c2;
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parsetable_key_part();
	        if (s2 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c13(s1, s2);
	          s0 = s1;
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = peg$parsetable_key_part();
	        if (s1 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c14(s1);
	        }
	        s0 = s1;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsetable_key_part() {
	      var s0, s1, s2, s3, s4;
	
	      var key    = peg$currPos * 49 + 7,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = [];
	      s2 = peg$parseS();
	      while (s2 !== peg$FAILED) {
	        s1.push(s2);
	        s2 = peg$parseS();
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parsekey();
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parseS();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parseS();
	          }
	          if (s3 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c15(s2);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = [];
	        s2 = peg$parseS();
	        while (s2 !== peg$FAILED) {
	          s1.push(s2);
	          s2 = peg$parseS();
	        }
	        if (s1 !== peg$FAILED) {
	          s2 = peg$parsequoted_key();
	          if (s2 !== peg$FAILED) {
	            s3 = [];
	            s4 = peg$parseS();
	            while (s4 !== peg$FAILED) {
	              s3.push(s4);
	              s4 = peg$parseS();
	            }
	            if (s3 !== peg$FAILED) {
	              peg$reportedPos = s0;
	              s1 = peg$c15(s2);
	              s0 = s1;
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsedot_ended_table_key_part() {
	      var s0, s1, s2, s3, s4, s5, s6;
	
	      var key    = peg$currPos * 49 + 8,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = [];
	      s2 = peg$parseS();
	      while (s2 !== peg$FAILED) {
	        s1.push(s2);
	        s2 = peg$parseS();
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parsekey();
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parseS();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parseS();
	          }
	          if (s3 !== peg$FAILED) {
	            if (input.charCodeAt(peg$currPos) === 46) {
	              s4 = peg$c16;
	              peg$currPos++;
	            } else {
	              s4 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c17); }
	            }
	            if (s4 !== peg$FAILED) {
	              s5 = [];
	              s6 = peg$parseS();
	              while (s6 !== peg$FAILED) {
	                s5.push(s6);
	                s6 = peg$parseS();
	              }
	              if (s5 !== peg$FAILED) {
	                peg$reportedPos = s0;
	                s1 = peg$c15(s2);
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = [];
	        s2 = peg$parseS();
	        while (s2 !== peg$FAILED) {
	          s1.push(s2);
	          s2 = peg$parseS();
	        }
	        if (s1 !== peg$FAILED) {
	          s2 = peg$parsequoted_key();
	          if (s2 !== peg$FAILED) {
	            s3 = [];
	            s4 = peg$parseS();
	            while (s4 !== peg$FAILED) {
	              s3.push(s4);
	              s4 = peg$parseS();
	            }
	            if (s3 !== peg$FAILED) {
	              if (input.charCodeAt(peg$currPos) === 46) {
	                s4 = peg$c16;
	                peg$currPos++;
	              } else {
	                s4 = peg$FAILED;
	                if (peg$silentFails === 0) { peg$fail(peg$c17); }
	              }
	              if (s4 !== peg$FAILED) {
	                s5 = [];
	                s6 = peg$parseS();
	                while (s6 !== peg$FAILED) {
	                  s5.push(s6);
	                  s6 = peg$parseS();
	                }
	                if (s5 !== peg$FAILED) {
	                  peg$reportedPos = s0;
	                  s1 = peg$c15(s2);
	                  s0 = s1;
	                } else {
	                  peg$currPos = s0;
	                  s0 = peg$c2;
	                }
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseassignment() {
	      var s0, s1, s2, s3, s4, s5;
	
	      var key    = peg$currPos * 49 + 9,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = peg$parsekey();
	      if (s1 !== peg$FAILED) {
	        s2 = [];
	        s3 = peg$parseS();
	        while (s3 !== peg$FAILED) {
	          s2.push(s3);
	          s3 = peg$parseS();
	        }
	        if (s2 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 61) {
	            s3 = peg$c18;
	            peg$currPos++;
	          } else {
	            s3 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c19); }
	          }
	          if (s3 !== peg$FAILED) {
	            s4 = [];
	            s5 = peg$parseS();
	            while (s5 !== peg$FAILED) {
	              s4.push(s5);
	              s5 = peg$parseS();
	            }
	            if (s4 !== peg$FAILED) {
	              s5 = peg$parsevalue();
	              if (s5 !== peg$FAILED) {
	                peg$reportedPos = s0;
	                s1 = peg$c20(s1, s5);
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = peg$parsequoted_key();
	        if (s1 !== peg$FAILED) {
	          s2 = [];
	          s3 = peg$parseS();
	          while (s3 !== peg$FAILED) {
	            s2.push(s3);
	            s3 = peg$parseS();
	          }
	          if (s2 !== peg$FAILED) {
	            if (input.charCodeAt(peg$currPos) === 61) {
	              s3 = peg$c18;
	              peg$currPos++;
	            } else {
	              s3 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c19); }
	            }
	            if (s3 !== peg$FAILED) {
	              s4 = [];
	              s5 = peg$parseS();
	              while (s5 !== peg$FAILED) {
	                s4.push(s5);
	                s5 = peg$parseS();
	              }
	              if (s4 !== peg$FAILED) {
	                s5 = peg$parsevalue();
	                if (s5 !== peg$FAILED) {
	                  peg$reportedPos = s0;
	                  s1 = peg$c20(s1, s5);
	                  s0 = s1;
	                } else {
	                  peg$currPos = s0;
	                  s0 = peg$c2;
	                }
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsekey() {
	      var s0, s1, s2;
	
	      var key    = peg$currPos * 49 + 10,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = [];
	      s2 = peg$parseASCII_BASIC();
	      if (s2 !== peg$FAILED) {
	        while (s2 !== peg$FAILED) {
	          s1.push(s2);
	          s2 = peg$parseASCII_BASIC();
	        }
	      } else {
	        s1 = peg$c2;
	      }
	      if (s1 !== peg$FAILED) {
	        peg$reportedPos = s0;
	        s1 = peg$c21(s1);
	      }
	      s0 = s1;
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsequoted_key() {
	      var s0, s1;
	
	      var key    = peg$currPos * 49 + 11,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = peg$parsedouble_quoted_single_line_string();
	      if (s1 !== peg$FAILED) {
	        peg$reportedPos = s0;
	        s1 = peg$c22(s1);
	      }
	      s0 = s1;
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = peg$parsesingle_quoted_single_line_string();
	        if (s1 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c22(s1);
	        }
	        s0 = s1;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsevalue() {
	      var s0;
	
	      var key    = peg$currPos * 49 + 12,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$parsestring();
	      if (s0 === peg$FAILED) {
	        s0 = peg$parsedatetime();
	        if (s0 === peg$FAILED) {
	          s0 = peg$parsefloat();
	          if (s0 === peg$FAILED) {
	            s0 = peg$parseinteger();
	            if (s0 === peg$FAILED) {
	              s0 = peg$parseboolean();
	              if (s0 === peg$FAILED) {
	                s0 = peg$parsearray();
	                if (s0 === peg$FAILED) {
	                  s0 = peg$parseinline_table();
	                }
	              }
	            }
	          }
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsestring() {
	      var s0;
	
	      var key    = peg$currPos * 49 + 13,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$parsedouble_quoted_multiline_string();
	      if (s0 === peg$FAILED) {
	        s0 = peg$parsedouble_quoted_single_line_string();
	        if (s0 === peg$FAILED) {
	          s0 = peg$parsesingle_quoted_multiline_string();
	          if (s0 === peg$FAILED) {
	            s0 = peg$parsesingle_quoted_single_line_string();
	          }
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsedouble_quoted_multiline_string() {
	      var s0, s1, s2, s3, s4;
	
	      var key    = peg$currPos * 49 + 14,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.substr(peg$currPos, 3) === peg$c23) {
	        s1 = peg$c23;
	        peg$currPos += 3;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c24); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parseNL();
	        if (s2 === peg$FAILED) {
	          s2 = peg$c25;
	        }
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parsemultiline_string_char();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parsemultiline_string_char();
	          }
	          if (s3 !== peg$FAILED) {
	            if (input.substr(peg$currPos, 3) === peg$c23) {
	              s4 = peg$c23;
	              peg$currPos += 3;
	            } else {
	              s4 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c24); }
	            }
	            if (s4 !== peg$FAILED) {
	              peg$reportedPos = s0;
	              s1 = peg$c26(s3);
	              s0 = s1;
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsedouble_quoted_single_line_string() {
	      var s0, s1, s2, s3;
	
	      var key    = peg$currPos * 49 + 15,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 34) {
	        s1 = peg$c27;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c28); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = [];
	        s3 = peg$parsestring_char();
	        while (s3 !== peg$FAILED) {
	          s2.push(s3);
	          s3 = peg$parsestring_char();
	        }
	        if (s2 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 34) {
	            s3 = peg$c27;
	            peg$currPos++;
	          } else {
	            s3 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c28); }
	          }
	          if (s3 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c26(s2);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsesingle_quoted_multiline_string() {
	      var s0, s1, s2, s3, s4;
	
	      var key    = peg$currPos * 49 + 16,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.substr(peg$currPos, 3) === peg$c29) {
	        s1 = peg$c29;
	        peg$currPos += 3;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c30); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parseNL();
	        if (s2 === peg$FAILED) {
	          s2 = peg$c25;
	        }
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parsemultiline_literal_char();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parsemultiline_literal_char();
	          }
	          if (s3 !== peg$FAILED) {
	            if (input.substr(peg$currPos, 3) === peg$c29) {
	              s4 = peg$c29;
	              peg$currPos += 3;
	            } else {
	              s4 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c30); }
	            }
	            if (s4 !== peg$FAILED) {
	              peg$reportedPos = s0;
	              s1 = peg$c26(s3);
	              s0 = s1;
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsesingle_quoted_single_line_string() {
	      var s0, s1, s2, s3;
	
	      var key    = peg$currPos * 49 + 17,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 39) {
	        s1 = peg$c31;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c32); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = [];
	        s3 = peg$parseliteral_char();
	        while (s3 !== peg$FAILED) {
	          s2.push(s3);
	          s3 = peg$parseliteral_char();
	        }
	        if (s2 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 39) {
	            s3 = peg$c31;
	            peg$currPos++;
	          } else {
	            s3 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c32); }
	          }
	          if (s3 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c26(s2);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsestring_char() {
	      var s0, s1, s2;
	
	      var key    = peg$currPos * 49 + 18,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$parseESCAPED();
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = peg$currPos;
	        peg$silentFails++;
	        if (input.charCodeAt(peg$currPos) === 34) {
	          s2 = peg$c27;
	          peg$currPos++;
	        } else {
	          s2 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c28); }
	        }
	        peg$silentFails--;
	        if (s2 === peg$FAILED) {
	          s1 = peg$c5;
	        } else {
	          peg$currPos = s1;
	          s1 = peg$c2;
	        }
	        if (s1 !== peg$FAILED) {
	          if (input.length > peg$currPos) {
	            s2 = input.charAt(peg$currPos);
	            peg$currPos++;
	          } else {
	            s2 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c6); }
	          }
	          if (s2 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c33(s2);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseliteral_char() {
	      var s0, s1, s2;
	
	      var key    = peg$currPos * 49 + 19,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = peg$currPos;
	      peg$silentFails++;
	      if (input.charCodeAt(peg$currPos) === 39) {
	        s2 = peg$c31;
	        peg$currPos++;
	      } else {
	        s2 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c32); }
	      }
	      peg$silentFails--;
	      if (s2 === peg$FAILED) {
	        s1 = peg$c5;
	      } else {
	        peg$currPos = s1;
	        s1 = peg$c2;
	      }
	      if (s1 !== peg$FAILED) {
	        if (input.length > peg$currPos) {
	          s2 = input.charAt(peg$currPos);
	          peg$currPos++;
	        } else {
	          s2 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c6); }
	        }
	        if (s2 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c33(s2);
	          s0 = s1;
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsemultiline_string_char() {
	      var s0, s1, s2;
	
	      var key    = peg$currPos * 49 + 20,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$parseESCAPED();
	      if (s0 === peg$FAILED) {
	        s0 = peg$parsemultiline_string_delim();
	        if (s0 === peg$FAILED) {
	          s0 = peg$currPos;
	          s1 = peg$currPos;
	          peg$silentFails++;
	          if (input.substr(peg$currPos, 3) === peg$c23) {
	            s2 = peg$c23;
	            peg$currPos += 3;
	          } else {
	            s2 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c24); }
	          }
	          peg$silentFails--;
	          if (s2 === peg$FAILED) {
	            s1 = peg$c5;
	          } else {
	            peg$currPos = s1;
	            s1 = peg$c2;
	          }
	          if (s1 !== peg$FAILED) {
	            if (input.length > peg$currPos) {
	              s2 = input.charAt(peg$currPos);
	              peg$currPos++;
	            } else {
	              s2 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c6); }
	            }
	            if (s2 !== peg$FAILED) {
	              peg$reportedPos = s0;
	              s1 = peg$c34(s2);
	              s0 = s1;
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsemultiline_string_delim() {
	      var s0, s1, s2, s3, s4;
	
	      var key    = peg$currPos * 49 + 21,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 92) {
	        s1 = peg$c35;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c36); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parseNL();
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parseNLS();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parseNLS();
	          }
	          if (s3 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c37();
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsemultiline_literal_char() {
	      var s0, s1, s2;
	
	      var key    = peg$currPos * 49 + 22,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = peg$currPos;
	      peg$silentFails++;
	      if (input.substr(peg$currPos, 3) === peg$c29) {
	        s2 = peg$c29;
	        peg$currPos += 3;
	      } else {
	        s2 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c30); }
	      }
	      peg$silentFails--;
	      if (s2 === peg$FAILED) {
	        s1 = peg$c5;
	      } else {
	        peg$currPos = s1;
	        s1 = peg$c2;
	      }
	      if (s1 !== peg$FAILED) {
	        if (input.length > peg$currPos) {
	          s2 = input.charAt(peg$currPos);
	          peg$currPos++;
	        } else {
	          s2 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c6); }
	        }
	        if (s2 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c33(s2);
	          s0 = s1;
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsefloat() {
	      var s0, s1, s2, s3;
	
	      var key    = peg$currPos * 49 + 23,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = peg$parsefloat_text();
	      if (s1 === peg$FAILED) {
	        s1 = peg$parseinteger_text();
	      }
	      if (s1 !== peg$FAILED) {
	        if (input.charCodeAt(peg$currPos) === 101) {
	          s2 = peg$c38;
	          peg$currPos++;
	        } else {
	          s2 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c39); }
	        }
	        if (s2 === peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 69) {
	            s2 = peg$c40;
	            peg$currPos++;
	          } else {
	            s2 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c41); }
	          }
	        }
	        if (s2 !== peg$FAILED) {
	          s3 = peg$parseinteger_text();
	          if (s3 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c42(s1, s3);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = peg$parsefloat_text();
	        if (s1 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c43(s1);
	        }
	        s0 = s1;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsefloat_text() {
	      var s0, s1, s2, s3, s4, s5;
	
	      var key    = peg$currPos * 49 + 24,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 43) {
	        s1 = peg$c44;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c45); }
	      }
	      if (s1 === peg$FAILED) {
	        s1 = peg$c25;
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$currPos;
	        s3 = peg$parseDIGITS();
	        if (s3 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 46) {
	            s4 = peg$c16;
	            peg$currPos++;
	          } else {
	            s4 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c17); }
	          }
	          if (s4 !== peg$FAILED) {
	            s5 = peg$parseDIGITS();
	            if (s5 !== peg$FAILED) {
	              s3 = [s3, s4, s5];
	              s2 = s3;
	            } else {
	              peg$currPos = s2;
	              s2 = peg$c2;
	            }
	          } else {
	            peg$currPos = s2;
	            s2 = peg$c2;
	          }
	        } else {
	          peg$currPos = s2;
	          s2 = peg$c2;
	        }
	        if (s2 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c46(s2);
	          s0 = s1;
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        if (input.charCodeAt(peg$currPos) === 45) {
	          s1 = peg$c47;
	          peg$currPos++;
	        } else {
	          s1 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c48); }
	        }
	        if (s1 !== peg$FAILED) {
	          s2 = peg$currPos;
	          s3 = peg$parseDIGITS();
	          if (s3 !== peg$FAILED) {
	            if (input.charCodeAt(peg$currPos) === 46) {
	              s4 = peg$c16;
	              peg$currPos++;
	            } else {
	              s4 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c17); }
	            }
	            if (s4 !== peg$FAILED) {
	              s5 = peg$parseDIGITS();
	              if (s5 !== peg$FAILED) {
	                s3 = [s3, s4, s5];
	                s2 = s3;
	              } else {
	                peg$currPos = s2;
	                s2 = peg$c2;
	              }
	            } else {
	              peg$currPos = s2;
	              s2 = peg$c2;
	            }
	          } else {
	            peg$currPos = s2;
	            s2 = peg$c2;
	          }
	          if (s2 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c49(s2);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseinteger() {
	      var s0, s1;
	
	      var key    = peg$currPos * 49 + 25,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = peg$parseinteger_text();
	      if (s1 !== peg$FAILED) {
	        peg$reportedPos = s0;
	        s1 = peg$c50(s1);
	      }
	      s0 = s1;
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseinteger_text() {
	      var s0, s1, s2, s3, s4;
	
	      var key    = peg$currPos * 49 + 26,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 43) {
	        s1 = peg$c44;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c45); }
	      }
	      if (s1 === peg$FAILED) {
	        s1 = peg$c25;
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = [];
	        s3 = peg$parseDIGIT_OR_UNDER();
	        if (s3 !== peg$FAILED) {
	          while (s3 !== peg$FAILED) {
	            s2.push(s3);
	            s3 = peg$parseDIGIT_OR_UNDER();
	          }
	        } else {
	          s2 = peg$c2;
	        }
	        if (s2 !== peg$FAILED) {
	          s3 = peg$currPos;
	          peg$silentFails++;
	          if (input.charCodeAt(peg$currPos) === 46) {
	            s4 = peg$c16;
	            peg$currPos++;
	          } else {
	            s4 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c17); }
	          }
	          peg$silentFails--;
	          if (s4 === peg$FAILED) {
	            s3 = peg$c5;
	          } else {
	            peg$currPos = s3;
	            s3 = peg$c2;
	          }
	          if (s3 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c46(s2);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        if (input.charCodeAt(peg$currPos) === 45) {
	          s1 = peg$c47;
	          peg$currPos++;
	        } else {
	          s1 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c48); }
	        }
	        if (s1 !== peg$FAILED) {
	          s2 = [];
	          s3 = peg$parseDIGIT_OR_UNDER();
	          if (s3 !== peg$FAILED) {
	            while (s3 !== peg$FAILED) {
	              s2.push(s3);
	              s3 = peg$parseDIGIT_OR_UNDER();
	            }
	          } else {
	            s2 = peg$c2;
	          }
	          if (s2 !== peg$FAILED) {
	            s3 = peg$currPos;
	            peg$silentFails++;
	            if (input.charCodeAt(peg$currPos) === 46) {
	              s4 = peg$c16;
	              peg$currPos++;
	            } else {
	              s4 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c17); }
	            }
	            peg$silentFails--;
	            if (s4 === peg$FAILED) {
	              s3 = peg$c5;
	            } else {
	              peg$currPos = s3;
	              s3 = peg$c2;
	            }
	            if (s3 !== peg$FAILED) {
	              peg$reportedPos = s0;
	              s1 = peg$c49(s2);
	              s0 = s1;
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseboolean() {
	      var s0, s1;
	
	      var key    = peg$currPos * 49 + 27,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.substr(peg$currPos, 4) === peg$c51) {
	        s1 = peg$c51;
	        peg$currPos += 4;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c52); }
	      }
	      if (s1 !== peg$FAILED) {
	        peg$reportedPos = s0;
	        s1 = peg$c53();
	      }
	      s0 = s1;
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        if (input.substr(peg$currPos, 5) === peg$c54) {
	          s1 = peg$c54;
	          peg$currPos += 5;
	        } else {
	          s1 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c55); }
	        }
	        if (s1 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c56();
	        }
	        s0 = s1;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsearray() {
	      var s0, s1, s2, s3, s4;
	
	      var key    = peg$currPos * 49 + 28,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 91) {
	        s1 = peg$c7;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c8); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = [];
	        s3 = peg$parsearray_sep();
	        while (s3 !== peg$FAILED) {
	          s2.push(s3);
	          s3 = peg$parsearray_sep();
	        }
	        if (s2 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 93) {
	            s3 = peg$c9;
	            peg$currPos++;
	          } else {
	            s3 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c10); }
	          }
	          if (s3 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c57();
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        if (input.charCodeAt(peg$currPos) === 91) {
	          s1 = peg$c7;
	          peg$currPos++;
	        } else {
	          s1 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c8); }
	        }
	        if (s1 !== peg$FAILED) {
	          s2 = peg$parsearray_value();
	          if (s2 === peg$FAILED) {
	            s2 = peg$c25;
	          }
	          if (s2 !== peg$FAILED) {
	            if (input.charCodeAt(peg$currPos) === 93) {
	              s3 = peg$c9;
	              peg$currPos++;
	            } else {
	              s3 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c10); }
	            }
	            if (s3 !== peg$FAILED) {
	              peg$reportedPos = s0;
	              s1 = peg$c58(s2);
	              s0 = s1;
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	        if (s0 === peg$FAILED) {
	          s0 = peg$currPos;
	          if (input.charCodeAt(peg$currPos) === 91) {
	            s1 = peg$c7;
	            peg$currPos++;
	          } else {
	            s1 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c8); }
	          }
	          if (s1 !== peg$FAILED) {
	            s2 = [];
	            s3 = peg$parsearray_value_list();
	            if (s3 !== peg$FAILED) {
	              while (s3 !== peg$FAILED) {
	                s2.push(s3);
	                s3 = peg$parsearray_value_list();
	              }
	            } else {
	              s2 = peg$c2;
	            }
	            if (s2 !== peg$FAILED) {
	              if (input.charCodeAt(peg$currPos) === 93) {
	                s3 = peg$c9;
	                peg$currPos++;
	              } else {
	                s3 = peg$FAILED;
	                if (peg$silentFails === 0) { peg$fail(peg$c10); }
	              }
	              if (s3 !== peg$FAILED) {
	                peg$reportedPos = s0;
	                s1 = peg$c59(s2);
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	          if (s0 === peg$FAILED) {
	            s0 = peg$currPos;
	            if (input.charCodeAt(peg$currPos) === 91) {
	              s1 = peg$c7;
	              peg$currPos++;
	            } else {
	              s1 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c8); }
	            }
	            if (s1 !== peg$FAILED) {
	              s2 = [];
	              s3 = peg$parsearray_value_list();
	              if (s3 !== peg$FAILED) {
	                while (s3 !== peg$FAILED) {
	                  s2.push(s3);
	                  s3 = peg$parsearray_value_list();
	                }
	              } else {
	                s2 = peg$c2;
	              }
	              if (s2 !== peg$FAILED) {
	                s3 = peg$parsearray_value();
	                if (s3 !== peg$FAILED) {
	                  if (input.charCodeAt(peg$currPos) === 93) {
	                    s4 = peg$c9;
	                    peg$currPos++;
	                  } else {
	                    s4 = peg$FAILED;
	                    if (peg$silentFails === 0) { peg$fail(peg$c10); }
	                  }
	                  if (s4 !== peg$FAILED) {
	                    peg$reportedPos = s0;
	                    s1 = peg$c60(s2, s3);
	                    s0 = s1;
	                  } else {
	                    peg$currPos = s0;
	                    s0 = peg$c2;
	                  }
	                } else {
	                  peg$currPos = s0;
	                  s0 = peg$c2;
	                }
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          }
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsearray_value() {
	      var s0, s1, s2, s3, s4;
	
	      var key    = peg$currPos * 49 + 29,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = [];
	      s2 = peg$parsearray_sep();
	      while (s2 !== peg$FAILED) {
	        s1.push(s2);
	        s2 = peg$parsearray_sep();
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parsevalue();
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parsearray_sep();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parsearray_sep();
	          }
	          if (s3 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c61(s2);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsearray_value_list() {
	      var s0, s1, s2, s3, s4, s5, s6;
	
	      var key    = peg$currPos * 49 + 30,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = [];
	      s2 = peg$parsearray_sep();
	      while (s2 !== peg$FAILED) {
	        s1.push(s2);
	        s2 = peg$parsearray_sep();
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parsevalue();
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parsearray_sep();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parsearray_sep();
	          }
	          if (s3 !== peg$FAILED) {
	            if (input.charCodeAt(peg$currPos) === 44) {
	              s4 = peg$c62;
	              peg$currPos++;
	            } else {
	              s4 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c63); }
	            }
	            if (s4 !== peg$FAILED) {
	              s5 = [];
	              s6 = peg$parsearray_sep();
	              while (s6 !== peg$FAILED) {
	                s5.push(s6);
	                s6 = peg$parsearray_sep();
	              }
	              if (s5 !== peg$FAILED) {
	                peg$reportedPos = s0;
	                s1 = peg$c61(s2);
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsearray_sep() {
	      var s0;
	
	      var key    = peg$currPos * 49 + 31,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$parseS();
	      if (s0 === peg$FAILED) {
	        s0 = peg$parseNL();
	        if (s0 === peg$FAILED) {
	          s0 = peg$parsecomment();
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseinline_table() {
	      var s0, s1, s2, s3, s4, s5;
	
	      var key    = peg$currPos * 49 + 32,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 123) {
	        s1 = peg$c64;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c65); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = [];
	        s3 = peg$parseS();
	        while (s3 !== peg$FAILED) {
	          s2.push(s3);
	          s3 = peg$parseS();
	        }
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parseinline_table_assignment();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parseinline_table_assignment();
	          }
	          if (s3 !== peg$FAILED) {
	            s4 = [];
	            s5 = peg$parseS();
	            while (s5 !== peg$FAILED) {
	              s4.push(s5);
	              s5 = peg$parseS();
	            }
	            if (s4 !== peg$FAILED) {
	              if (input.charCodeAt(peg$currPos) === 125) {
	                s5 = peg$c66;
	                peg$currPos++;
	              } else {
	                s5 = peg$FAILED;
	                if (peg$silentFails === 0) { peg$fail(peg$c67); }
	              }
	              if (s5 !== peg$FAILED) {
	                peg$reportedPos = s0;
	                s1 = peg$c68(s3);
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseinline_table_assignment() {
	      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;
	
	      var key    = peg$currPos * 49 + 33,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = [];
	      s2 = peg$parseS();
	      while (s2 !== peg$FAILED) {
	        s1.push(s2);
	        s2 = peg$parseS();
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parsekey();
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parseS();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parseS();
	          }
	          if (s3 !== peg$FAILED) {
	            if (input.charCodeAt(peg$currPos) === 61) {
	              s4 = peg$c18;
	              peg$currPos++;
	            } else {
	              s4 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c19); }
	            }
	            if (s4 !== peg$FAILED) {
	              s5 = [];
	              s6 = peg$parseS();
	              while (s6 !== peg$FAILED) {
	                s5.push(s6);
	                s6 = peg$parseS();
	              }
	              if (s5 !== peg$FAILED) {
	                s6 = peg$parsevalue();
	                if (s6 !== peg$FAILED) {
	                  s7 = [];
	                  s8 = peg$parseS();
	                  while (s8 !== peg$FAILED) {
	                    s7.push(s8);
	                    s8 = peg$parseS();
	                  }
	                  if (s7 !== peg$FAILED) {
	                    if (input.charCodeAt(peg$currPos) === 44) {
	                      s8 = peg$c62;
	                      peg$currPos++;
	                    } else {
	                      s8 = peg$FAILED;
	                      if (peg$silentFails === 0) { peg$fail(peg$c63); }
	                    }
	                    if (s8 !== peg$FAILED) {
	                      s9 = [];
	                      s10 = peg$parseS();
	                      while (s10 !== peg$FAILED) {
	                        s9.push(s10);
	                        s10 = peg$parseS();
	                      }
	                      if (s9 !== peg$FAILED) {
	                        peg$reportedPos = s0;
	                        s1 = peg$c69(s2, s6);
	                        s0 = s1;
	                      } else {
	                        peg$currPos = s0;
	                        s0 = peg$c2;
	                      }
	                    } else {
	                      peg$currPos = s0;
	                      s0 = peg$c2;
	                    }
	                  } else {
	                    peg$currPos = s0;
	                    s0 = peg$c2;
	                  }
	                } else {
	                  peg$currPos = s0;
	                  s0 = peg$c2;
	                }
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = [];
	        s2 = peg$parseS();
	        while (s2 !== peg$FAILED) {
	          s1.push(s2);
	          s2 = peg$parseS();
	        }
	        if (s1 !== peg$FAILED) {
	          s2 = peg$parsekey();
	          if (s2 !== peg$FAILED) {
	            s3 = [];
	            s4 = peg$parseS();
	            while (s4 !== peg$FAILED) {
	              s3.push(s4);
	              s4 = peg$parseS();
	            }
	            if (s3 !== peg$FAILED) {
	              if (input.charCodeAt(peg$currPos) === 61) {
	                s4 = peg$c18;
	                peg$currPos++;
	              } else {
	                s4 = peg$FAILED;
	                if (peg$silentFails === 0) { peg$fail(peg$c19); }
	              }
	              if (s4 !== peg$FAILED) {
	                s5 = [];
	                s6 = peg$parseS();
	                while (s6 !== peg$FAILED) {
	                  s5.push(s6);
	                  s6 = peg$parseS();
	                }
	                if (s5 !== peg$FAILED) {
	                  s6 = peg$parsevalue();
	                  if (s6 !== peg$FAILED) {
	                    peg$reportedPos = s0;
	                    s1 = peg$c69(s2, s6);
	                    s0 = s1;
	                  } else {
	                    peg$currPos = s0;
	                    s0 = peg$c2;
	                  }
	                } else {
	                  peg$currPos = s0;
	                  s0 = peg$c2;
	                }
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsesecfragment() {
	      var s0, s1, s2;
	
	      var key    = peg$currPos * 49 + 34,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 46) {
	        s1 = peg$c16;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c17); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parseDIGITS();
	        if (s2 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c70(s2);
	          s0 = s1;
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsedate() {
	      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;
	
	      var key    = peg$currPos * 49 + 35,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = peg$currPos;
	      s2 = peg$parseDIGIT_OR_UNDER();
	      if (s2 !== peg$FAILED) {
	        s3 = peg$parseDIGIT_OR_UNDER();
	        if (s3 !== peg$FAILED) {
	          s4 = peg$parseDIGIT_OR_UNDER();
	          if (s4 !== peg$FAILED) {
	            s5 = peg$parseDIGIT_OR_UNDER();
	            if (s5 !== peg$FAILED) {
	              if (input.charCodeAt(peg$currPos) === 45) {
	                s6 = peg$c47;
	                peg$currPos++;
	              } else {
	                s6 = peg$FAILED;
	                if (peg$silentFails === 0) { peg$fail(peg$c48); }
	              }
	              if (s6 !== peg$FAILED) {
	                s7 = peg$parseDIGIT_OR_UNDER();
	                if (s7 !== peg$FAILED) {
	                  s8 = peg$parseDIGIT_OR_UNDER();
	                  if (s8 !== peg$FAILED) {
	                    if (input.charCodeAt(peg$currPos) === 45) {
	                      s9 = peg$c47;
	                      peg$currPos++;
	                    } else {
	                      s9 = peg$FAILED;
	                      if (peg$silentFails === 0) { peg$fail(peg$c48); }
	                    }
	                    if (s9 !== peg$FAILED) {
	                      s10 = peg$parseDIGIT_OR_UNDER();
	                      if (s10 !== peg$FAILED) {
	                        s11 = peg$parseDIGIT_OR_UNDER();
	                        if (s11 !== peg$FAILED) {
	                          s2 = [s2, s3, s4, s5, s6, s7, s8, s9, s10, s11];
	                          s1 = s2;
	                        } else {
	                          peg$currPos = s1;
	                          s1 = peg$c2;
	                        }
	                      } else {
	                        peg$currPos = s1;
	                        s1 = peg$c2;
	                      }
	                    } else {
	                      peg$currPos = s1;
	                      s1 = peg$c2;
	                    }
	                  } else {
	                    peg$currPos = s1;
	                    s1 = peg$c2;
	                  }
	                } else {
	                  peg$currPos = s1;
	                  s1 = peg$c2;
	                }
	              } else {
	                peg$currPos = s1;
	                s1 = peg$c2;
	              }
	            } else {
	              peg$currPos = s1;
	              s1 = peg$c2;
	            }
	          } else {
	            peg$currPos = s1;
	            s1 = peg$c2;
	          }
	        } else {
	          peg$currPos = s1;
	          s1 = peg$c2;
	        }
	      } else {
	        peg$currPos = s1;
	        s1 = peg$c2;
	      }
	      if (s1 !== peg$FAILED) {
	        peg$reportedPos = s0;
	        s1 = peg$c71(s1);
	      }
	      s0 = s1;
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsetime() {
	      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;
	
	      var key    = peg$currPos * 49 + 36,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = peg$currPos;
	      s2 = peg$parseDIGIT_OR_UNDER();
	      if (s2 !== peg$FAILED) {
	        s3 = peg$parseDIGIT_OR_UNDER();
	        if (s3 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 58) {
	            s4 = peg$c72;
	            peg$currPos++;
	          } else {
	            s4 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c73); }
	          }
	          if (s4 !== peg$FAILED) {
	            s5 = peg$parseDIGIT_OR_UNDER();
	            if (s5 !== peg$FAILED) {
	              s6 = peg$parseDIGIT_OR_UNDER();
	              if (s6 !== peg$FAILED) {
	                if (input.charCodeAt(peg$currPos) === 58) {
	                  s7 = peg$c72;
	                  peg$currPos++;
	                } else {
	                  s7 = peg$FAILED;
	                  if (peg$silentFails === 0) { peg$fail(peg$c73); }
	                }
	                if (s7 !== peg$FAILED) {
	                  s8 = peg$parseDIGIT_OR_UNDER();
	                  if (s8 !== peg$FAILED) {
	                    s9 = peg$parseDIGIT_OR_UNDER();
	                    if (s9 !== peg$FAILED) {
	                      s10 = peg$parsesecfragment();
	                      if (s10 === peg$FAILED) {
	                        s10 = peg$c25;
	                      }
	                      if (s10 !== peg$FAILED) {
	                        s2 = [s2, s3, s4, s5, s6, s7, s8, s9, s10];
	                        s1 = s2;
	                      } else {
	                        peg$currPos = s1;
	                        s1 = peg$c2;
	                      }
	                    } else {
	                      peg$currPos = s1;
	                      s1 = peg$c2;
	                    }
	                  } else {
	                    peg$currPos = s1;
	                    s1 = peg$c2;
	                  }
	                } else {
	                  peg$currPos = s1;
	                  s1 = peg$c2;
	                }
	              } else {
	                peg$currPos = s1;
	                s1 = peg$c2;
	              }
	            } else {
	              peg$currPos = s1;
	              s1 = peg$c2;
	            }
	          } else {
	            peg$currPos = s1;
	            s1 = peg$c2;
	          }
	        } else {
	          peg$currPos = s1;
	          s1 = peg$c2;
	        }
	      } else {
	        peg$currPos = s1;
	        s1 = peg$c2;
	      }
	      if (s1 !== peg$FAILED) {
	        peg$reportedPos = s0;
	        s1 = peg$c74(s1);
	      }
	      s0 = s1;
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsetime_with_offset() {
	      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16;
	
	      var key    = peg$currPos * 49 + 37,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = peg$currPos;
	      s2 = peg$parseDIGIT_OR_UNDER();
	      if (s2 !== peg$FAILED) {
	        s3 = peg$parseDIGIT_OR_UNDER();
	        if (s3 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 58) {
	            s4 = peg$c72;
	            peg$currPos++;
	          } else {
	            s4 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c73); }
	          }
	          if (s4 !== peg$FAILED) {
	            s5 = peg$parseDIGIT_OR_UNDER();
	            if (s5 !== peg$FAILED) {
	              s6 = peg$parseDIGIT_OR_UNDER();
	              if (s6 !== peg$FAILED) {
	                if (input.charCodeAt(peg$currPos) === 58) {
	                  s7 = peg$c72;
	                  peg$currPos++;
	                } else {
	                  s7 = peg$FAILED;
	                  if (peg$silentFails === 0) { peg$fail(peg$c73); }
	                }
	                if (s7 !== peg$FAILED) {
	                  s8 = peg$parseDIGIT_OR_UNDER();
	                  if (s8 !== peg$FAILED) {
	                    s9 = peg$parseDIGIT_OR_UNDER();
	                    if (s9 !== peg$FAILED) {
	                      s10 = peg$parsesecfragment();
	                      if (s10 === peg$FAILED) {
	                        s10 = peg$c25;
	                      }
	                      if (s10 !== peg$FAILED) {
	                        if (input.charCodeAt(peg$currPos) === 45) {
	                          s11 = peg$c47;
	                          peg$currPos++;
	                        } else {
	                          s11 = peg$FAILED;
	                          if (peg$silentFails === 0) { peg$fail(peg$c48); }
	                        }
	                        if (s11 === peg$FAILED) {
	                          if (input.charCodeAt(peg$currPos) === 43) {
	                            s11 = peg$c44;
	                            peg$currPos++;
	                          } else {
	                            s11 = peg$FAILED;
	                            if (peg$silentFails === 0) { peg$fail(peg$c45); }
	                          }
	                        }
	                        if (s11 !== peg$FAILED) {
	                          s12 = peg$parseDIGIT_OR_UNDER();
	                          if (s12 !== peg$FAILED) {
	                            s13 = peg$parseDIGIT_OR_UNDER();
	                            if (s13 !== peg$FAILED) {
	                              if (input.charCodeAt(peg$currPos) === 58) {
	                                s14 = peg$c72;
	                                peg$currPos++;
	                              } else {
	                                s14 = peg$FAILED;
	                                if (peg$silentFails === 0) { peg$fail(peg$c73); }
	                              }
	                              if (s14 !== peg$FAILED) {
	                                s15 = peg$parseDIGIT_OR_UNDER();
	                                if (s15 !== peg$FAILED) {
	                                  s16 = peg$parseDIGIT_OR_UNDER();
	                                  if (s16 !== peg$FAILED) {
	                                    s2 = [s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16];
	                                    s1 = s2;
	                                  } else {
	                                    peg$currPos = s1;
	                                    s1 = peg$c2;
	                                  }
	                                } else {
	                                  peg$currPos = s1;
	                                  s1 = peg$c2;
	                                }
	                              } else {
	                                peg$currPos = s1;
	                                s1 = peg$c2;
	                              }
	                            } else {
	                              peg$currPos = s1;
	                              s1 = peg$c2;
	                            }
	                          } else {
	                            peg$currPos = s1;
	                            s1 = peg$c2;
	                          }
	                        } else {
	                          peg$currPos = s1;
	                          s1 = peg$c2;
	                        }
	                      } else {
	                        peg$currPos = s1;
	                        s1 = peg$c2;
	                      }
	                    } else {
	                      peg$currPos = s1;
	                      s1 = peg$c2;
	                    }
	                  } else {
	                    peg$currPos = s1;
	                    s1 = peg$c2;
	                  }
	                } else {
	                  peg$currPos = s1;
	                  s1 = peg$c2;
	                }
	              } else {
	                peg$currPos = s1;
	                s1 = peg$c2;
	              }
	            } else {
	              peg$currPos = s1;
	              s1 = peg$c2;
	            }
	          } else {
	            peg$currPos = s1;
	            s1 = peg$c2;
	          }
	        } else {
	          peg$currPos = s1;
	          s1 = peg$c2;
	        }
	      } else {
	        peg$currPos = s1;
	        s1 = peg$c2;
	      }
	      if (s1 !== peg$FAILED) {
	        peg$reportedPos = s0;
	        s1 = peg$c74(s1);
	      }
	      s0 = s1;
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsedatetime() {
	      var s0, s1, s2, s3, s4;
	
	      var key    = peg$currPos * 49 + 38,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = peg$parsedate();
	      if (s1 !== peg$FAILED) {
	        if (input.charCodeAt(peg$currPos) === 84) {
	          s2 = peg$c75;
	          peg$currPos++;
	        } else {
	          s2 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c76); }
	        }
	        if (s2 !== peg$FAILED) {
	          s3 = peg$parsetime();
	          if (s3 !== peg$FAILED) {
	            if (input.charCodeAt(peg$currPos) === 90) {
	              s4 = peg$c77;
	              peg$currPos++;
	            } else {
	              s4 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c78); }
	            }
	            if (s4 !== peg$FAILED) {
	              peg$reportedPos = s0;
	              s1 = peg$c79(s1, s3);
	              s0 = s1;
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = peg$parsedate();
	        if (s1 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 84) {
	            s2 = peg$c75;
	            peg$currPos++;
	          } else {
	            s2 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c76); }
	          }
	          if (s2 !== peg$FAILED) {
	            s3 = peg$parsetime_with_offset();
	            if (s3 !== peg$FAILED) {
	              peg$reportedPos = s0;
	              s1 = peg$c80(s1, s3);
	              s0 = s1;
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseS() {
	      var s0;
	
	      var key    = peg$currPos * 49 + 39,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      if (peg$c81.test(input.charAt(peg$currPos))) {
	        s0 = input.charAt(peg$currPos);
	        peg$currPos++;
	      } else {
	        s0 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c82); }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseNL() {
	      var s0, s1, s2;
	
	      var key    = peg$currPos * 49 + 40,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      if (input.charCodeAt(peg$currPos) === 10) {
	        s0 = peg$c83;
	        peg$currPos++;
	      } else {
	        s0 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c84); }
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        if (input.charCodeAt(peg$currPos) === 13) {
	          s1 = peg$c85;
	          peg$currPos++;
	        } else {
	          s1 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c86); }
	        }
	        if (s1 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 10) {
	            s2 = peg$c83;
	            peg$currPos++;
	          } else {
	            s2 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c84); }
	          }
	          if (s2 !== peg$FAILED) {
	            s1 = [s1, s2];
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseNLS() {
	      var s0;
	
	      var key    = peg$currPos * 49 + 41,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$parseNL();
	      if (s0 === peg$FAILED) {
	        s0 = peg$parseS();
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseEOF() {
	      var s0, s1;
	
	      var key    = peg$currPos * 49 + 42,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      peg$silentFails++;
	      if (input.length > peg$currPos) {
	        s1 = input.charAt(peg$currPos);
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c6); }
	      }
	      peg$silentFails--;
	      if (s1 === peg$FAILED) {
	        s0 = peg$c5;
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseHEX() {
	      var s0;
	
	      var key    = peg$currPos * 49 + 43,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      if (peg$c87.test(input.charAt(peg$currPos))) {
	        s0 = input.charAt(peg$currPos);
	        peg$currPos++;
	      } else {
	        s0 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c88); }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseDIGIT_OR_UNDER() {
	      var s0, s1;
	
	      var key    = peg$currPos * 49 + 44,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      if (peg$c89.test(input.charAt(peg$currPos))) {
	        s0 = input.charAt(peg$currPos);
	        peg$currPos++;
	      } else {
	        s0 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c90); }
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        if (input.charCodeAt(peg$currPos) === 95) {
	          s1 = peg$c91;
	          peg$currPos++;
	        } else {
	          s1 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c92); }
	        }
	        if (s1 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c93();
	        }
	        s0 = s1;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseASCII_BASIC() {
	      var s0;
	
	      var key    = peg$currPos * 49 + 45,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      if (peg$c94.test(input.charAt(peg$currPos))) {
	        s0 = input.charAt(peg$currPos);
	        peg$currPos++;
	      } else {
	        s0 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c95); }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseDIGITS() {
	      var s0, s1, s2;
	
	      var key    = peg$currPos * 49 + 46,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = [];
	      s2 = peg$parseDIGIT_OR_UNDER();
	      if (s2 !== peg$FAILED) {
	        while (s2 !== peg$FAILED) {
	          s1.push(s2);
	          s2 = peg$parseDIGIT_OR_UNDER();
	        }
	      } else {
	        s1 = peg$c2;
	      }
	      if (s1 !== peg$FAILED) {
	        peg$reportedPos = s0;
	        s1 = peg$c96(s1);
	      }
	      s0 = s1;
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseESCAPED() {
	      var s0, s1;
	
	      var key    = peg$currPos * 49 + 47,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.substr(peg$currPos, 2) === peg$c97) {
	        s1 = peg$c97;
	        peg$currPos += 2;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c98); }
	      }
	      if (s1 !== peg$FAILED) {
	        peg$reportedPos = s0;
	        s1 = peg$c99();
	      }
	      s0 = s1;
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        if (input.substr(peg$currPos, 2) === peg$c100) {
	          s1 = peg$c100;
	          peg$currPos += 2;
	        } else {
	          s1 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c101); }
	        }
	        if (s1 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c102();
	        }
	        s0 = s1;
	        if (s0 === peg$FAILED) {
	          s0 = peg$currPos;
	          if (input.substr(peg$currPos, 2) === peg$c103) {
	            s1 = peg$c103;
	            peg$currPos += 2;
	          } else {
	            s1 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c104); }
	          }
	          if (s1 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c105();
	          }
	          s0 = s1;
	          if (s0 === peg$FAILED) {
	            s0 = peg$currPos;
	            if (input.substr(peg$currPos, 2) === peg$c106) {
	              s1 = peg$c106;
	              peg$currPos += 2;
	            } else {
	              s1 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c107); }
	            }
	            if (s1 !== peg$FAILED) {
	              peg$reportedPos = s0;
	              s1 = peg$c108();
	            }
	            s0 = s1;
	            if (s0 === peg$FAILED) {
	              s0 = peg$currPos;
	              if (input.substr(peg$currPos, 2) === peg$c109) {
	                s1 = peg$c109;
	                peg$currPos += 2;
	              } else {
	                s1 = peg$FAILED;
	                if (peg$silentFails === 0) { peg$fail(peg$c110); }
	              }
	              if (s1 !== peg$FAILED) {
	                peg$reportedPos = s0;
	                s1 = peg$c111();
	              }
	              s0 = s1;
	              if (s0 === peg$FAILED) {
	                s0 = peg$currPos;
	                if (input.substr(peg$currPos, 2) === peg$c112) {
	                  s1 = peg$c112;
	                  peg$currPos += 2;
	                } else {
	                  s1 = peg$FAILED;
	                  if (peg$silentFails === 0) { peg$fail(peg$c113); }
	                }
	                if (s1 !== peg$FAILED) {
	                  peg$reportedPos = s0;
	                  s1 = peg$c114();
	                }
	                s0 = s1;
	                if (s0 === peg$FAILED) {
	                  s0 = peg$currPos;
	                  if (input.substr(peg$currPos, 2) === peg$c115) {
	                    s1 = peg$c115;
	                    peg$currPos += 2;
	                  } else {
	                    s1 = peg$FAILED;
	                    if (peg$silentFails === 0) { peg$fail(peg$c116); }
	                  }
	                  if (s1 !== peg$FAILED) {
	                    peg$reportedPos = s0;
	                    s1 = peg$c117();
	                  }
	                  s0 = s1;
	                  if (s0 === peg$FAILED) {
	                    s0 = peg$parseESCAPED_UNICODE();
	                  }
	                }
	              }
	            }
	          }
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseESCAPED_UNICODE() {
	      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;
	
	      var key    = peg$currPos * 49 + 48,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.substr(peg$currPos, 2) === peg$c118) {
	        s1 = peg$c118;
	        peg$currPos += 2;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c119); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$currPos;
	        s3 = peg$parseHEX();
	        if (s3 !== peg$FAILED) {
	          s4 = peg$parseHEX();
	          if (s4 !== peg$FAILED) {
	            s5 = peg$parseHEX();
	            if (s5 !== peg$FAILED) {
	              s6 = peg$parseHEX();
	              if (s6 !== peg$FAILED) {
	                s7 = peg$parseHEX();
	                if (s7 !== peg$FAILED) {
	                  s8 = peg$parseHEX();
	                  if (s8 !== peg$FAILED) {
	                    s9 = peg$parseHEX();
	                    if (s9 !== peg$FAILED) {
	                      s10 = peg$parseHEX();
	                      if (s10 !== peg$FAILED) {
	                        s3 = [s3, s4, s5, s6, s7, s8, s9, s10];
	                        s2 = s3;
	                      } else {
	                        peg$currPos = s2;
	                        s2 = peg$c2;
	                      }
	                    } else {
	                      peg$currPos = s2;
	                      s2 = peg$c2;
	                    }
	                  } else {
	                    peg$currPos = s2;
	                    s2 = peg$c2;
	                  }
	                } else {
	                  peg$currPos = s2;
	                  s2 = peg$c2;
	                }
	              } else {
	                peg$currPos = s2;
	                s2 = peg$c2;
	              }
	            } else {
	              peg$currPos = s2;
	              s2 = peg$c2;
	            }
	          } else {
	            peg$currPos = s2;
	            s2 = peg$c2;
	          }
	        } else {
	          peg$currPos = s2;
	          s2 = peg$c2;
	        }
	        if (s2 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c120(s2);
	          s0 = s1;
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        if (input.substr(peg$currPos, 2) === peg$c121) {
	          s1 = peg$c121;
	          peg$currPos += 2;
	        } else {
	          s1 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c122); }
	        }
	        if (s1 !== peg$FAILED) {
	          s2 = peg$currPos;
	          s3 = peg$parseHEX();
	          if (s3 !== peg$FAILED) {
	            s4 = peg$parseHEX();
	            if (s4 !== peg$FAILED) {
	              s5 = peg$parseHEX();
	              if (s5 !== peg$FAILED) {
	                s6 = peg$parseHEX();
	                if (s6 !== peg$FAILED) {
	                  s3 = [s3, s4, s5, s6];
	                  s2 = s3;
	                } else {
	                  peg$currPos = s2;
	                  s2 = peg$c2;
	                }
	              } else {
	                peg$currPos = s2;
	                s2 = peg$c2;
	              }
	            } else {
	              peg$currPos = s2;
	              s2 = peg$c2;
	            }
	          } else {
	            peg$currPos = s2;
	            s2 = peg$c2;
	          }
	          if (s2 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c120(s2);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	
	      var nodes = [];
	
	      function genError(err, line, col) {
	        var ex = new Error(err);
	        ex.line = line;
	        ex.column = col;
	        throw ex;
	      }
	
	      function addNode(node) {
	        nodes.push(node);
	      }
	
	      function node(type, value, line, column, key) {
	        var obj = { type: type, value: value, line: line(), column: column() };
	        if (key) obj.key = key;
	        return obj;
	      }
	
	      function convertCodePoint(str, line, col) {
	        var num = parseInt("0x" + str);
	
	        if (
	          !isFinite(num) ||
	          Math.floor(num) != num ||
	          num < 0 ||
	          num > 0x10FFFF ||
	          (num > 0xD7FF && num < 0xE000)
	        ) {
	          genError("Invalid Unicode escape code: " + str, line, col);
	        } else {
	          return fromCodePoint(num);
	        }
	      }
	
	      function fromCodePoint() {
	        var MAX_SIZE = 0x4000;
	        var codeUnits = [];
	        var highSurrogate;
	        var lowSurrogate;
	        var index = -1;
	        var length = arguments.length;
	        if (!length) {
	          return '';
	        }
	        var result = '';
	        while (++index < length) {
	          var codePoint = Number(arguments[index]);
	          if (codePoint <= 0xFFFF) { // BMP code point
	            codeUnits.push(codePoint);
	          } else { // Astral code point; split in surrogate halves
	            // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
	            codePoint -= 0x10000;
	            highSurrogate = (codePoint >> 10) + 0xD800;
	            lowSurrogate = (codePoint % 0x400) + 0xDC00;
	            codeUnits.push(highSurrogate, lowSurrogate);
	          }
	          if (index + 1 == length || codeUnits.length > MAX_SIZE) {
	            result += String.fromCharCode.apply(null, codeUnits);
	            codeUnits.length = 0;
	          }
	        }
	        return result;
	      }
	
	
	    peg$result = peg$startRuleFunction();
	
	    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
	      return peg$result;
	    } else {
	      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
	        peg$fail({ type: "end", description: "end of input" });
	      }
	
	      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
	    }
	  }
	
	  return {
	    SyntaxError: SyntaxError,
	    parse:       parse
	  };
	})();
	
	
	/***/ }),
	/* 24 */
	/***/ (function(module, exports, __webpack_require__) {
	
	"use strict";
	
	function compile(nodes) {
	  var assignedPaths = [];
	  var valueAssignments = [];
	  var currentPath = "";
	  var data = {};
	  var context = data;
	  var arrayMode = false;
	
	  return reduce(nodes);
	
	  function reduce(nodes) {
	    var node;
	    for (var i in nodes) {
	      node = nodes[i];
	      switch (node.type) {
	      case "Assign":
	        assign(node);
	        break;
	      case "ObjectPath":
	        setPath(node);
	        break;
	      case "ArrayPath":
	        addTableArray(node);
	        break;
	      }
	    }
	
	    return data;
	  }
	
	  function genError(err, line, col) {
	    var ex = new Error(err);
	    ex.line = line;
	    ex.column = col;
	    throw ex;
	  }
	
	  function assign(node) {
	    var key = node.key;
	    var value = node.value;
	    var line = node.line;
	    var column = node.column;
	
	    var fullPath;
	    if (currentPath) {
	      fullPath = currentPath + "." + key;
	    } else {
	      fullPath = key;
	    }
	    if (typeof context[key] !== "undefined") {
	      genError("Cannot redefine existing key '" + fullPath + "'.", line, column);
	    }
	
	    context[key] = reduceValueNode(value);
	
	    if (!pathAssigned(fullPath)) {
	      assignedPaths.push(fullPath);
	      valueAssignments.push(fullPath);
	    }
	  }
	
	
	  function pathAssigned(path) {
	    return assignedPaths.indexOf(path) !== -1;
	  }
	
	  function reduceValueNode(node) {
	    if (node.type === "Array") {
	      return reduceArrayWithTypeChecking(node.value);
	    } else if (node.type === "InlineTable") {
	      return reduceInlineTableNode(node.value);
	    } else {
	      return node.value;
	    }
	  }
	
	  function reduceInlineTableNode(values) {
	    var obj = {};
	    for (var i = 0; i < values.length; i++) {
	      var val = values[i];
	      if (val.value.type === "InlineTable") {
	        obj[val.key] = reduceInlineTableNode(val.value.value);
	      } else if (val.type === "InlineTableValue") {
	        obj[val.key] = reduceValueNode(val.value);
	      }
	    }
	
	    return obj;
	  }
	
	  function setPath(node) {
	    var path = node.value;
	    var quotedPath = path.map(quoteDottedString).join(".");
	    var line = node.line;
	    var column = node.column;
	
	    if (pathAssigned(quotedPath)) {
	      genError("Cannot redefine existing key '" + path + "'.", line, column);
	    }
	    assignedPaths.push(quotedPath);
	    context = deepRef(data, path, {}, line, column);
	    currentPath = path;
	  }
	
	  function addTableArray(node) {
	    var path = node.value;
	    var quotedPath = path.map(quoteDottedString).join(".");
	    var line = node.line;
	    var column = node.column;
	
	    if (!pathAssigned(quotedPath)) {
	      assignedPaths.push(quotedPath);
	    }
	    assignedPaths = assignedPaths.filter(function(p) {
	      return p.indexOf(quotedPath) !== 0;
	    });
	    assignedPaths.push(quotedPath);
	    context = deepRef(data, path, [], line, column);
	    currentPath = quotedPath;
	
	    if (context instanceof Array) {
	      var newObj = {};
	      context.push(newObj);
	      context = newObj;
	    } else {
	      genError("Cannot redefine existing key '" + path + "'.", line, column);
	    }
	  }
	
	  // Given a path 'a.b.c', create (as necessary) `start.a`,
	  // `start.a.b`, and `start.a.b.c`, assigning `value` to `start.a.b.c`.
	  // If `a` or `b` are arrays and have items in them, the last item in the
	  // array is used as the context for the next sub-path.
	  function deepRef(start, keys, value, line, column) {
	    var key;
	    var traversed = [];
	    var traversedPath = "";
	    var path = keys.join(".");
	    var ctx = start;
	    var keysLen = keys.length;
	
	    for (var i in keys) {
	      key = keys[i];
	      traversed.push(key);
	      traversedPath = traversed.join(".");
	      if (typeof ctx[key] === "undefined") {
	        if (i === String(keysLen - 1)) {
	          ctx[key] = value;
	        } else {
	          ctx[key] = {};
	        }
	      } else if (i !== keysLen - 1 && valueAssignments.indexOf(traversedPath) > -1) {
	        // already a non-object value at key, can't be used as part of a new path
	        genError("Cannot redefine existing key '" + traversedPath + "'.", line, column);
	      }
	
	      ctx = ctx[key];
	      if (ctx instanceof Array && ctx.length && i < keys.length - 1) {
	        ctx = ctx[ctx.length - 1];
	      }
	    }
	
	    return ctx;
	  }
	
	  function reduceArrayWithTypeChecking(array) {
	    // Ensure that all items in the array are of the same type
	    var firstType = null;
	    for(var i in array) {
	      var node = array[i];
	      if (firstType === null) {
	        firstType = node.type;
	      } else if ((node.type === "Integer" || node.type === "Float") && (firstType === "Integer" || firstType === "Float")) {
	        // OK.
	      } else if (node.type !== firstType) {
	        genError("Cannot add value of type " + node.type + " to array of type " +
	          firstType + ".", node.line, node.column);
	      }
	    }
	
	    // Recursively reduce array of nodes into array of the nodes' values
	    return array.map(reduceValueNode);
	  }
	
	  function quoteDottedString(str) {
	    if (str.indexOf(".") > -1) {
	      return "\"" + str + "\"";
	    } else {
	      return str;
	    }
	  }
	}
	
	module.exports = {
	  compile: compile
	};
	
	
	/***/ }),
	/* 25 */
	/***/ (function(module, __webpack_exports__, __webpack_require__) {
	
	"use strict";
	Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
	/* harmony export (immutable) */ __webpack_exports__["setup"] = setup;
	/* harmony export (immutable) */ __webpack_exports__["uploadPDF"] = uploadPDF;
	/* harmony export (immutable) */ __webpack_exports__["setResult"] = setResult;
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__uis_alertDialog__ = __webpack_require__(0);
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__funcs_upload__ = __webpack_require__(26);
	/**
	 * UI parts - Upload Button.
	 */
	
	
	
	function setup ({
	    getCurrentDisplayContentFile,
	    uploadFinishCallback = function () {}
	}) {
	    $('.js-btn-upload').off('click').on('click', () => {
	        const contentFile = getCurrentDisplayContentFile()
	        uploadPDF({
	            contentFile,
	            successCallback : uploadFinishCallback
	        })
	        return false
	    })
	}
	
	function uploadPDF ({
	    contentFile,
	    successCallback = function () {}
	}) {
	
	    if (!contentFile) {
	        return __WEBPACK_IMPORTED_MODULE_0__uis_alertDialog__["show"]({ message : 'Display a content before upload.' })
	    }
	
	    // Progress bar.
	    const $progressBar = $('.js-upload-progress')
	
	    // Upload and analyze the PDF.
	    Object(__WEBPACK_IMPORTED_MODULE_1__funcs_upload__["a" /* upload */])({
	        contentFile,
	        willStartCallback : () => {
	            // Reset the result text.
	            setResult('Waiting for response...')
	            // Show the progress bar.
	            $progressBar.removeClass('hidden').find('.progress-bar').css('width', '0%').attr('aria-valuenow', 0).text('0%')
	        },
	        progressCallback : percent => {
	            $progressBar.find('.progress-bar').css('width', percent + '%').attr('aria-valuenow', percent).text(percent + '%')
	            if (percent === 100) {
	                setTimeout(() => {
	                    $progressBar.addClass('hidden')
	                }, 2000)
	            }
	        },
	        successCallback : resultText => {
	            setResult(resultText)
	            successCallback(resultText)
	        },
	        failedCallback : err => {
	            const message = 'Failed to upload and analyze your PDF.<br>Reason: ' + err
	            __WEBPACK_IMPORTED_MODULE_0__uis_alertDialog__["show"]({ message })
	            setResult(err)
	        }
	    })
	}
	
	/**
	 * Set the analyzing result.
	 */
	function setResult (text) {
	    $('#uploadResult').val(text)
	}
	
	
	/***/ }),
	/* 26 */
	/***/ (function(module, __webpack_exports__, __webpack_require__) {
	
	"use strict";
	/* harmony export (immutable) */ __webpack_exports__["a"] = upload;
	/**
	 * Functions - upload and analyze a PDF.
	 */
	function upload ({
	    contentFile,
	    willStartCallback = function () {},
	    progressCallback = function () {},
	    successCallback = function () {},
	    failedCallback = function () {}
	} = {}) {
	
	    // Convert PDF to base64 string.
	    const contentBase64 = arrayBufferToBase64(contentFile.content)
	
	    // API endpoint.
	    const url = window.API_ROOT + '/api/pdf_upload'
	
	    // API params.
	    let data = {
	        filename : contentFile.name,
	        pdf      : contentBase64
	    }
	
	    // Callback before ajax call.
	    willStartCallback()
	
	    // Call the API.
	    $.ajax({
	        xhr : function () {
	            var xhr = new window.XMLHttpRequest()
	            // Upload progress
	            xhr.upload.addEventListener('progress', function (evt) {
	                if (evt.lengthComputable) {
	                    var percentComplete = evt.loaded / evt.total
	                    // Do something with upload progress
	                    console.log('uploadProgress:', percentComplete)
	                    let percent = Math.floor(percentComplete * 100)
	                    progressCallback(percent)
	                }
	            }, false)
	
	            return xhr
	        },
	        url      : url,
	        method   : 'POST',
	        dataType : 'json',
	        data
	
	    }).then(result => {
	        if (result.status === 'failure') {
	            failedCallback(result.err.stderr || result.err || result)
	            return
	        }
	
	        setTimeout(() => {
	            successCallback(result.text)
	        }, 500) // wait for progress bar animation.
	    })
	}
	
	function arrayBufferToBase64 (buffer) {
	    var s = ''
	    var bytes = new Uint8Array(buffer)
	    var len = bytes.byteLength
	    for (var i = 0; i < len; i++) {
	        s += String.fromCharCode(bytes[i])
	    }
	    return window.btoa(s)
	}
	
	
	/***/ }),
	/* 27 */
	/***/ (function(module, __webpack_exports__, __webpack_require__) {
	
	"use strict";
	Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__alertDialog__ = __webpack_require__(0);
	/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "alertDialog", function() { return __WEBPACK_IMPORTED_MODULE_0__alertDialog__; });
	
	
	
	
	
	/***/ }),
	/* 28 */
	/***/ (function(module, __webpack_exports__, __webpack_require__) {
	
	"use strict";
	Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
	/* harmony export (immutable) */ __webpack_exports__["setup"] = setup;
	/**
	 * Event listeners.
	 */
	
	/**
	 * Initializer.
	 */
	function setup () {
	    $(document).on('keydown', e => {
	        if (e.keyCode === 17 || e.keyCode === 91) { // 17:ctrlKey, 91:cmdKey
	            dispatchWindowEvent('manageCtrlKey', 'on')
	        }
	    }).on('keyup', e => {
	        // Allow any keyboard events for <input/>.
	        if (e.target.tagName.toLowerCase() === 'input') {
	            return
	        }
	
	        dispatchWindowEvent('manageCtrlKey', 'off')
	
	        if (e.keyCode === 49) {         // Digit "1"
	            dispatchWindowEvent('digitKeyPressed', 1)
	        } else if (e.keyCode === 50) {  // Digit "2"
	            dispatchWindowEvent('digitKeyPressed', 2)
	        } else if (e.keyCode === 51) {  // Digit "3"
	            dispatchWindowEvent('digitKeyPressed', 3)
	        } else if (e.keyCode === 52) {  // Digit "4"
	            dispatchWindowEvent('digitKeyPressed', 4)
	        }
	    })
	}
	
	/**
	 * Dispatch a custom event to `window` object.
	 */
	function dispatchWindowEvent (eventName, data) {
	    var event = document.createEvent('CustomEvent')
	    event.initCustomEvent(eventName, true, true, data)
	    window.dispatchEvent(event)
	}
	
	
	/***/ })
	/******/ ]);
	});
	//# sourceMappingURL=index.js.map

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

	const TomlParser = __webpack_require__(8);
	const Highlight = __webpack_require__(11);
	const RelationAnnotation = __webpack_require__(14);
	const Annotation = __webpack_require__(13);
	
	exports.saveToml = (annotationSet)=>{
	  let data = ["version = 0.1"];
	  annotationSet.forEach((annotation)=>{
	    data.push("");
	    data.push(`[${annotation.getId()}]`);
	    data.push(annotation.saveToml());
	  });
	  return [data.join("\n")];
	};
	
	exports.renderAnnotation = (tomlObj, highlighter, arrowConnector, referenceId, color) => {
	  for(key in tomlObj) {
	    if ("version" == key) {
	      continue;
	    }
	    let annotation = undefined;
	    // Span.
	    if (Highlight.isMydata(tomlObj[key])) {
	      annotation = highlighter.addToml(key, tomlObj[key], referenceId);
	    }
	    // Relation(one-way, two-way, or link)
	    if (RelationAnnotation.isMydata(tomlObj[key])) {
	      annotation = arrowConnector.addToml(key, tomlObj[key], referenceId);
	    }
	    if (null == annotation) {
	      console.log(`Cannot create an annotation. id: ${key}, referenceId: ${referenceId}, toml(the following).`);
	      console.log(tomlObj[key]);
	    } else if (undefined != color) {
	      annotation.setColor(color);
	    }
	  }
	};
	
	/**
	 * @param objectOrText ... TomlObject(Hash) or Toml source text.
	 * @param highlighter ... Highlight annotation containr.
	 * @param arrowConnector ... Relation annotation container.
	 * @param referenceId (optional) ... Used to identify annotations.
	 */
	exports.loadToml = (objectOrText, highlighter, arrowConnector, referenceId, color)=>{
	  if ('string' == typeof(objectOrText)) {
	    objectOrText = TomlParser.parse(objectOrText);
	  }
	  exports.renderAnnotation(objectOrText, highlighter, arrowConnector, referenceId, color);
	};


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

	var parser = __webpack_require__(9);
	var compiler = __webpack_require__(10);
	
	module.exports = {
	  parse: function(input) {
	    var nodes = parser.parse(input.toString());
	    return compiler.compile(nodes);
	  }
	};


/***/ }),
/* 9 */
/***/ (function(module, exports) {

	module.exports = (function() {
	  /*
	   * Generated by PEG.js 0.8.0.
	   *
	   * http://pegjs.majda.cz/
	   */
	
	  function peg$subclass(child, parent) {
	    function ctor() { this.constructor = child; }
	    ctor.prototype = parent.prototype;
	    child.prototype = new ctor();
	  }
	
	  function SyntaxError(message, expected, found, offset, line, column) {
	    this.message  = message;
	    this.expected = expected;
	    this.found    = found;
	    this.offset   = offset;
	    this.line     = line;
	    this.column   = column;
	
	    this.name     = "SyntaxError";
	  }
	
	  peg$subclass(SyntaxError, Error);
	
	  function parse(input) {
	    var options = arguments.length > 1 ? arguments[1] : {},
	
	        peg$FAILED = {},
	
	        peg$startRuleFunctions = { start: peg$parsestart },
	        peg$startRuleFunction  = peg$parsestart,
	
	        peg$c0 = [],
	        peg$c1 = function() { return nodes },
	        peg$c2 = peg$FAILED,
	        peg$c3 = "#",
	        peg$c4 = { type: "literal", value: "#", description: "\"#\"" },
	        peg$c5 = void 0,
	        peg$c6 = { type: "any", description: "any character" },
	        peg$c7 = "[",
	        peg$c8 = { type: "literal", value: "[", description: "\"[\"" },
	        peg$c9 = "]",
	        peg$c10 = { type: "literal", value: "]", description: "\"]\"" },
	        peg$c11 = function(name) { addNode(node('ObjectPath', name, line, column)) },
	        peg$c12 = function(name) { addNode(node('ArrayPath', name, line, column)) },
	        peg$c13 = function(parts, name) { return parts.concat(name) },
	        peg$c14 = function(name) { return [name] },
	        peg$c15 = function(name) { return name },
	        peg$c16 = ".",
	        peg$c17 = { type: "literal", value: ".", description: "\".\"" },
	        peg$c18 = "=",
	        peg$c19 = { type: "literal", value: "=", description: "\"=\"" },
	        peg$c20 = function(key, value) { addNode(node('Assign', value, line, column, key)) },
	        peg$c21 = function(chars) { return chars.join('') },
	        peg$c22 = function(node) { return node.value },
	        peg$c23 = "\"\"\"",
	        peg$c24 = { type: "literal", value: "\"\"\"", description: "\"\\\"\\\"\\\"\"" },
	        peg$c25 = null,
	        peg$c26 = function(chars) { return node('String', chars.join(''), line, column) },
	        peg$c27 = "\"",
	        peg$c28 = { type: "literal", value: "\"", description: "\"\\\"\"" },
	        peg$c29 = "'''",
	        peg$c30 = { type: "literal", value: "'''", description: "\"'''\"" },
	        peg$c31 = "'",
	        peg$c32 = { type: "literal", value: "'", description: "\"'\"" },
	        peg$c33 = function(char) { return char },
	        peg$c34 = function(char) { return char},
	        peg$c35 = "\\",
	        peg$c36 = { type: "literal", value: "\\", description: "\"\\\\\"" },
	        peg$c37 = function() { return '' },
	        peg$c38 = "e",
	        peg$c39 = { type: "literal", value: "e", description: "\"e\"" },
	        peg$c40 = "E",
	        peg$c41 = { type: "literal", value: "E", description: "\"E\"" },
	        peg$c42 = function(left, right) { return node('Float', parseFloat(left + 'e' + right), line, column) },
	        peg$c43 = function(text) { return node('Float', parseFloat(text), line, column) },
	        peg$c44 = "+",
	        peg$c45 = { type: "literal", value: "+", description: "\"+\"" },
	        peg$c46 = function(digits) { return digits.join('') },
	        peg$c47 = "-",
	        peg$c48 = { type: "literal", value: "-", description: "\"-\"" },
	        peg$c49 = function(digits) { return '-' + digits.join('') },
	        peg$c50 = function(text) { return node('Integer', parseInt(text, 10), line, column) },
	        peg$c51 = "true",
	        peg$c52 = { type: "literal", value: "true", description: "\"true\"" },
	        peg$c53 = function() { return node('Boolean', true, line, column) },
	        peg$c54 = "false",
	        peg$c55 = { type: "literal", value: "false", description: "\"false\"" },
	        peg$c56 = function() { return node('Boolean', false, line, column) },
	        peg$c57 = function() { return node('Array', [], line, column) },
	        peg$c58 = function(value) { return node('Array', value ? [value] : [], line, column) },
	        peg$c59 = function(values) { return node('Array', values, line, column) },
	        peg$c60 = function(values, value) { return node('Array', values.concat(value), line, column) },
	        peg$c61 = function(value) { return value },
	        peg$c62 = ",",
	        peg$c63 = { type: "literal", value: ",", description: "\",\"" },
	        peg$c64 = "{",
	        peg$c65 = { type: "literal", value: "{", description: "\"{\"" },
	        peg$c66 = "}",
	        peg$c67 = { type: "literal", value: "}", description: "\"}\"" },
	        peg$c68 = function(values) { return node('InlineTable', values, line, column) },
	        peg$c69 = function(key, value) { return node('InlineTableValue', value, line, column, key) },
	        peg$c70 = function(digits) { return "." + digits },
	        peg$c71 = function(date) { return  date.join('') },
	        peg$c72 = ":",
	        peg$c73 = { type: "literal", value: ":", description: "\":\"" },
	        peg$c74 = function(time) { return time.join('') },
	        peg$c75 = "T",
	        peg$c76 = { type: "literal", value: "T", description: "\"T\"" },
	        peg$c77 = "Z",
	        peg$c78 = { type: "literal", value: "Z", description: "\"Z\"" },
	        peg$c79 = function(date, time) { return node('Date', new Date(date + "T" + time + "Z"), line, column) },
	        peg$c80 = function(date, time) { return node('Date', new Date(date + "T" + time), line, column) },
	        peg$c81 = /^[ \t]/,
	        peg$c82 = { type: "class", value: "[ \\t]", description: "[ \\t]" },
	        peg$c83 = "\n",
	        peg$c84 = { type: "literal", value: "\n", description: "\"\\n\"" },
	        peg$c85 = "\r",
	        peg$c86 = { type: "literal", value: "\r", description: "\"\\r\"" },
	        peg$c87 = /^[0-9a-f]/i,
	        peg$c88 = { type: "class", value: "[0-9a-f]i", description: "[0-9a-f]i" },
	        peg$c89 = /^[0-9]/,
	        peg$c90 = { type: "class", value: "[0-9]", description: "[0-9]" },
	        peg$c91 = "_",
	        peg$c92 = { type: "literal", value: "_", description: "\"_\"" },
	        peg$c93 = function() { return "" },
	        peg$c94 = /^[A-Za-z0-9_\-]/,
	        peg$c95 = { type: "class", value: "[A-Za-z0-9_\\-]", description: "[A-Za-z0-9_\\-]" },
	        peg$c96 = function(d) { return d.join('') },
	        peg$c97 = "\\\"",
	        peg$c98 = { type: "literal", value: "\\\"", description: "\"\\\\\\\"\"" },
	        peg$c99 = function() { return '"'  },
	        peg$c100 = "\\\\",
	        peg$c101 = { type: "literal", value: "\\\\", description: "\"\\\\\\\\\"" },
	        peg$c102 = function() { return '\\' },
	        peg$c103 = "\\b",
	        peg$c104 = { type: "literal", value: "\\b", description: "\"\\\\b\"" },
	        peg$c105 = function() { return '\b' },
	        peg$c106 = "\\t",
	        peg$c107 = { type: "literal", value: "\\t", description: "\"\\\\t\"" },
	        peg$c108 = function() { return '\t' },
	        peg$c109 = "\\n",
	        peg$c110 = { type: "literal", value: "\\n", description: "\"\\\\n\"" },
	        peg$c111 = function() { return '\n' },
	        peg$c112 = "\\f",
	        peg$c113 = { type: "literal", value: "\\f", description: "\"\\\\f\"" },
	        peg$c114 = function() { return '\f' },
	        peg$c115 = "\\r",
	        peg$c116 = { type: "literal", value: "\\r", description: "\"\\\\r\"" },
	        peg$c117 = function() { return '\r' },
	        peg$c118 = "\\U",
	        peg$c119 = { type: "literal", value: "\\U", description: "\"\\\\U\"" },
	        peg$c120 = function(digits) { return convertCodePoint(digits.join('')) },
	        peg$c121 = "\\u",
	        peg$c122 = { type: "literal", value: "\\u", description: "\"\\\\u\"" },
	
	        peg$currPos          = 0,
	        peg$reportedPos      = 0,
	        peg$cachedPos        = 0,
	        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
	        peg$maxFailPos       = 0,
	        peg$maxFailExpected  = [],
	        peg$silentFails      = 0,
	
	        peg$cache = {},
	        peg$result;
	
	    if ("startRule" in options) {
	      if (!(options.startRule in peg$startRuleFunctions)) {
	        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
	      }
	
	      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
	    }
	
	    function text() {
	      return input.substring(peg$reportedPos, peg$currPos);
	    }
	
	    function offset() {
	      return peg$reportedPos;
	    }
	
	    function line() {
	      return peg$computePosDetails(peg$reportedPos).line;
	    }
	
	    function column() {
	      return peg$computePosDetails(peg$reportedPos).column;
	    }
	
	    function expected(description) {
	      throw peg$buildException(
	        null,
	        [{ type: "other", description: description }],
	        peg$reportedPos
	      );
	    }
	
	    function error(message) {
	      throw peg$buildException(message, null, peg$reportedPos);
	    }
	
	    function peg$computePosDetails(pos) {
	      function advance(details, startPos, endPos) {
	        var p, ch;
	
	        for (p = startPos; p < endPos; p++) {
	          ch = input.charAt(p);
	          if (ch === "\n") {
	            if (!details.seenCR) { details.line++; }
	            details.column = 1;
	            details.seenCR = false;
	          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
	            details.line++;
	            details.column = 1;
	            details.seenCR = true;
	          } else {
	            details.column++;
	            details.seenCR = false;
	          }
	        }
	      }
	
	      if (peg$cachedPos !== pos) {
	        if (peg$cachedPos > pos) {
	          peg$cachedPos = 0;
	          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
	        }
	        advance(peg$cachedPosDetails, peg$cachedPos, pos);
	        peg$cachedPos = pos;
	      }
	
	      return peg$cachedPosDetails;
	    }
	
	    function peg$fail(expected) {
	      if (peg$currPos < peg$maxFailPos) { return; }
	
	      if (peg$currPos > peg$maxFailPos) {
	        peg$maxFailPos = peg$currPos;
	        peg$maxFailExpected = [];
	      }
	
	      peg$maxFailExpected.push(expected);
	    }
	
	    function peg$buildException(message, expected, pos) {
	      function cleanupExpected(expected) {
	        var i = 1;
	
	        expected.sort(function(a, b) {
	          if (a.description < b.description) {
	            return -1;
	          } else if (a.description > b.description) {
	            return 1;
	          } else {
	            return 0;
	          }
	        });
	
	        while (i < expected.length) {
	          if (expected[i - 1] === expected[i]) {
	            expected.splice(i, 1);
	          } else {
	            i++;
	          }
	        }
	      }
	
	      function buildMessage(expected, found) {
	        function stringEscape(s) {
	          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }
	
	          return s
	            .replace(/\\/g,   '\\\\')
	            .replace(/"/g,    '\\"')
	            .replace(/\x08/g, '\\b')
	            .replace(/\t/g,   '\\t')
	            .replace(/\n/g,   '\\n')
	            .replace(/\f/g,   '\\f')
	            .replace(/\r/g,   '\\r')
	            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
	            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
	            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
	            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
	        }
	
	        var expectedDescs = new Array(expected.length),
	            expectedDesc, foundDesc, i;
	
	        for (i = 0; i < expected.length; i++) {
	          expectedDescs[i] = expected[i].description;
	        }
	
	        expectedDesc = expected.length > 1
	          ? expectedDescs.slice(0, -1).join(", ")
	              + " or "
	              + expectedDescs[expected.length - 1]
	          : expectedDescs[0];
	
	        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";
	
	        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
	      }
	
	      var posDetails = peg$computePosDetails(pos),
	          found      = pos < input.length ? input.charAt(pos) : null;
	
	      if (expected !== null) {
	        cleanupExpected(expected);
	      }
	
	      return new SyntaxError(
	        message !== null ? message : buildMessage(expected, found),
	        expected,
	        found,
	        pos,
	        posDetails.line,
	        posDetails.column
	      );
	    }
	
	    function peg$parsestart() {
	      var s0, s1, s2;
	
	      var key    = peg$currPos * 49 + 0,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = [];
	      s2 = peg$parseline();
	      while (s2 !== peg$FAILED) {
	        s1.push(s2);
	        s2 = peg$parseline();
	      }
	      if (s1 !== peg$FAILED) {
	        peg$reportedPos = s0;
	        s1 = peg$c1();
	      }
	      s0 = s1;
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseline() {
	      var s0, s1, s2, s3, s4, s5, s6;
	
	      var key    = peg$currPos * 49 + 1,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = [];
	      s2 = peg$parseS();
	      while (s2 !== peg$FAILED) {
	        s1.push(s2);
	        s2 = peg$parseS();
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parseexpression();
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parseS();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parseS();
	          }
	          if (s3 !== peg$FAILED) {
	            s4 = [];
	            s5 = peg$parsecomment();
	            while (s5 !== peg$FAILED) {
	              s4.push(s5);
	              s5 = peg$parsecomment();
	            }
	            if (s4 !== peg$FAILED) {
	              s5 = [];
	              s6 = peg$parseNL();
	              if (s6 !== peg$FAILED) {
	                while (s6 !== peg$FAILED) {
	                  s5.push(s6);
	                  s6 = peg$parseNL();
	                }
	              } else {
	                s5 = peg$c2;
	              }
	              if (s5 === peg$FAILED) {
	                s5 = peg$parseEOF();
	              }
	              if (s5 !== peg$FAILED) {
	                s1 = [s1, s2, s3, s4, s5];
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = [];
	        s2 = peg$parseS();
	        if (s2 !== peg$FAILED) {
	          while (s2 !== peg$FAILED) {
	            s1.push(s2);
	            s2 = peg$parseS();
	          }
	        } else {
	          s1 = peg$c2;
	        }
	        if (s1 !== peg$FAILED) {
	          s2 = [];
	          s3 = peg$parseNL();
	          if (s3 !== peg$FAILED) {
	            while (s3 !== peg$FAILED) {
	              s2.push(s3);
	              s3 = peg$parseNL();
	            }
	          } else {
	            s2 = peg$c2;
	          }
	          if (s2 === peg$FAILED) {
	            s2 = peg$parseEOF();
	          }
	          if (s2 !== peg$FAILED) {
	            s1 = [s1, s2];
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	        if (s0 === peg$FAILED) {
	          s0 = peg$parseNL();
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseexpression() {
	      var s0;
	
	      var key    = peg$currPos * 49 + 2,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$parsecomment();
	      if (s0 === peg$FAILED) {
	        s0 = peg$parsepath();
	        if (s0 === peg$FAILED) {
	          s0 = peg$parsetablearray();
	          if (s0 === peg$FAILED) {
	            s0 = peg$parseassignment();
	          }
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsecomment() {
	      var s0, s1, s2, s3, s4, s5;
	
	      var key    = peg$currPos * 49 + 3,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 35) {
	        s1 = peg$c3;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c4); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = [];
	        s3 = peg$currPos;
	        s4 = peg$currPos;
	        peg$silentFails++;
	        s5 = peg$parseNL();
	        if (s5 === peg$FAILED) {
	          s5 = peg$parseEOF();
	        }
	        peg$silentFails--;
	        if (s5 === peg$FAILED) {
	          s4 = peg$c5;
	        } else {
	          peg$currPos = s4;
	          s4 = peg$c2;
	        }
	        if (s4 !== peg$FAILED) {
	          if (input.length > peg$currPos) {
	            s5 = input.charAt(peg$currPos);
	            peg$currPos++;
	          } else {
	            s5 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c6); }
	          }
	          if (s5 !== peg$FAILED) {
	            s4 = [s4, s5];
	            s3 = s4;
	          } else {
	            peg$currPos = s3;
	            s3 = peg$c2;
	          }
	        } else {
	          peg$currPos = s3;
	          s3 = peg$c2;
	        }
	        while (s3 !== peg$FAILED) {
	          s2.push(s3);
	          s3 = peg$currPos;
	          s4 = peg$currPos;
	          peg$silentFails++;
	          s5 = peg$parseNL();
	          if (s5 === peg$FAILED) {
	            s5 = peg$parseEOF();
	          }
	          peg$silentFails--;
	          if (s5 === peg$FAILED) {
	            s4 = peg$c5;
	          } else {
	            peg$currPos = s4;
	            s4 = peg$c2;
	          }
	          if (s4 !== peg$FAILED) {
	            if (input.length > peg$currPos) {
	              s5 = input.charAt(peg$currPos);
	              peg$currPos++;
	            } else {
	              s5 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c6); }
	            }
	            if (s5 !== peg$FAILED) {
	              s4 = [s4, s5];
	              s3 = s4;
	            } else {
	              peg$currPos = s3;
	              s3 = peg$c2;
	            }
	          } else {
	            peg$currPos = s3;
	            s3 = peg$c2;
	          }
	        }
	        if (s2 !== peg$FAILED) {
	          s1 = [s1, s2];
	          s0 = s1;
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsepath() {
	      var s0, s1, s2, s3, s4, s5;
	
	      var key    = peg$currPos * 49 + 4,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 91) {
	        s1 = peg$c7;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c8); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = [];
	        s3 = peg$parseS();
	        while (s3 !== peg$FAILED) {
	          s2.push(s3);
	          s3 = peg$parseS();
	        }
	        if (s2 !== peg$FAILED) {
	          s3 = peg$parsetable_key();
	          if (s3 !== peg$FAILED) {
	            s4 = [];
	            s5 = peg$parseS();
	            while (s5 !== peg$FAILED) {
	              s4.push(s5);
	              s5 = peg$parseS();
	            }
	            if (s4 !== peg$FAILED) {
	              if (input.charCodeAt(peg$currPos) === 93) {
	                s5 = peg$c9;
	                peg$currPos++;
	              } else {
	                s5 = peg$FAILED;
	                if (peg$silentFails === 0) { peg$fail(peg$c10); }
	              }
	              if (s5 !== peg$FAILED) {
	                peg$reportedPos = s0;
	                s1 = peg$c11(s3);
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsetablearray() {
	      var s0, s1, s2, s3, s4, s5, s6, s7;
	
	      var key    = peg$currPos * 49 + 5,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 91) {
	        s1 = peg$c7;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c8); }
	      }
	      if (s1 !== peg$FAILED) {
	        if (input.charCodeAt(peg$currPos) === 91) {
	          s2 = peg$c7;
	          peg$currPos++;
	        } else {
	          s2 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c8); }
	        }
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parseS();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parseS();
	          }
	          if (s3 !== peg$FAILED) {
	            s4 = peg$parsetable_key();
	            if (s4 !== peg$FAILED) {
	              s5 = [];
	              s6 = peg$parseS();
	              while (s6 !== peg$FAILED) {
	                s5.push(s6);
	                s6 = peg$parseS();
	              }
	              if (s5 !== peg$FAILED) {
	                if (input.charCodeAt(peg$currPos) === 93) {
	                  s6 = peg$c9;
	                  peg$currPos++;
	                } else {
	                  s6 = peg$FAILED;
	                  if (peg$silentFails === 0) { peg$fail(peg$c10); }
	                }
	                if (s6 !== peg$FAILED) {
	                  if (input.charCodeAt(peg$currPos) === 93) {
	                    s7 = peg$c9;
	                    peg$currPos++;
	                  } else {
	                    s7 = peg$FAILED;
	                    if (peg$silentFails === 0) { peg$fail(peg$c10); }
	                  }
	                  if (s7 !== peg$FAILED) {
	                    peg$reportedPos = s0;
	                    s1 = peg$c12(s4);
	                    s0 = s1;
	                  } else {
	                    peg$currPos = s0;
	                    s0 = peg$c2;
	                  }
	                } else {
	                  peg$currPos = s0;
	                  s0 = peg$c2;
	                }
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsetable_key() {
	      var s0, s1, s2;
	
	      var key    = peg$currPos * 49 + 6,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = [];
	      s2 = peg$parsedot_ended_table_key_part();
	      if (s2 !== peg$FAILED) {
	        while (s2 !== peg$FAILED) {
	          s1.push(s2);
	          s2 = peg$parsedot_ended_table_key_part();
	        }
	      } else {
	        s1 = peg$c2;
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parsetable_key_part();
	        if (s2 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c13(s1, s2);
	          s0 = s1;
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = peg$parsetable_key_part();
	        if (s1 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c14(s1);
	        }
	        s0 = s1;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsetable_key_part() {
	      var s0, s1, s2, s3, s4;
	
	      var key    = peg$currPos * 49 + 7,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = [];
	      s2 = peg$parseS();
	      while (s2 !== peg$FAILED) {
	        s1.push(s2);
	        s2 = peg$parseS();
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parsekey();
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parseS();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parseS();
	          }
	          if (s3 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c15(s2);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = [];
	        s2 = peg$parseS();
	        while (s2 !== peg$FAILED) {
	          s1.push(s2);
	          s2 = peg$parseS();
	        }
	        if (s1 !== peg$FAILED) {
	          s2 = peg$parsequoted_key();
	          if (s2 !== peg$FAILED) {
	            s3 = [];
	            s4 = peg$parseS();
	            while (s4 !== peg$FAILED) {
	              s3.push(s4);
	              s4 = peg$parseS();
	            }
	            if (s3 !== peg$FAILED) {
	              peg$reportedPos = s0;
	              s1 = peg$c15(s2);
	              s0 = s1;
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsedot_ended_table_key_part() {
	      var s0, s1, s2, s3, s4, s5, s6;
	
	      var key    = peg$currPos * 49 + 8,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = [];
	      s2 = peg$parseS();
	      while (s2 !== peg$FAILED) {
	        s1.push(s2);
	        s2 = peg$parseS();
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parsekey();
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parseS();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parseS();
	          }
	          if (s3 !== peg$FAILED) {
	            if (input.charCodeAt(peg$currPos) === 46) {
	              s4 = peg$c16;
	              peg$currPos++;
	            } else {
	              s4 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c17); }
	            }
	            if (s4 !== peg$FAILED) {
	              s5 = [];
	              s6 = peg$parseS();
	              while (s6 !== peg$FAILED) {
	                s5.push(s6);
	                s6 = peg$parseS();
	              }
	              if (s5 !== peg$FAILED) {
	                peg$reportedPos = s0;
	                s1 = peg$c15(s2);
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = [];
	        s2 = peg$parseS();
	        while (s2 !== peg$FAILED) {
	          s1.push(s2);
	          s2 = peg$parseS();
	        }
	        if (s1 !== peg$FAILED) {
	          s2 = peg$parsequoted_key();
	          if (s2 !== peg$FAILED) {
	            s3 = [];
	            s4 = peg$parseS();
	            while (s4 !== peg$FAILED) {
	              s3.push(s4);
	              s4 = peg$parseS();
	            }
	            if (s3 !== peg$FAILED) {
	              if (input.charCodeAt(peg$currPos) === 46) {
	                s4 = peg$c16;
	                peg$currPos++;
	              } else {
	                s4 = peg$FAILED;
	                if (peg$silentFails === 0) { peg$fail(peg$c17); }
	              }
	              if (s4 !== peg$FAILED) {
	                s5 = [];
	                s6 = peg$parseS();
	                while (s6 !== peg$FAILED) {
	                  s5.push(s6);
	                  s6 = peg$parseS();
	                }
	                if (s5 !== peg$FAILED) {
	                  peg$reportedPos = s0;
	                  s1 = peg$c15(s2);
	                  s0 = s1;
	                } else {
	                  peg$currPos = s0;
	                  s0 = peg$c2;
	                }
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseassignment() {
	      var s0, s1, s2, s3, s4, s5;
	
	      var key    = peg$currPos * 49 + 9,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = peg$parsekey();
	      if (s1 !== peg$FAILED) {
	        s2 = [];
	        s3 = peg$parseS();
	        while (s3 !== peg$FAILED) {
	          s2.push(s3);
	          s3 = peg$parseS();
	        }
	        if (s2 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 61) {
	            s3 = peg$c18;
	            peg$currPos++;
	          } else {
	            s3 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c19); }
	          }
	          if (s3 !== peg$FAILED) {
	            s4 = [];
	            s5 = peg$parseS();
	            while (s5 !== peg$FAILED) {
	              s4.push(s5);
	              s5 = peg$parseS();
	            }
	            if (s4 !== peg$FAILED) {
	              s5 = peg$parsevalue();
	              if (s5 !== peg$FAILED) {
	                peg$reportedPos = s0;
	                s1 = peg$c20(s1, s5);
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = peg$parsequoted_key();
	        if (s1 !== peg$FAILED) {
	          s2 = [];
	          s3 = peg$parseS();
	          while (s3 !== peg$FAILED) {
	            s2.push(s3);
	            s3 = peg$parseS();
	          }
	          if (s2 !== peg$FAILED) {
	            if (input.charCodeAt(peg$currPos) === 61) {
	              s3 = peg$c18;
	              peg$currPos++;
	            } else {
	              s3 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c19); }
	            }
	            if (s3 !== peg$FAILED) {
	              s4 = [];
	              s5 = peg$parseS();
	              while (s5 !== peg$FAILED) {
	                s4.push(s5);
	                s5 = peg$parseS();
	              }
	              if (s4 !== peg$FAILED) {
	                s5 = peg$parsevalue();
	                if (s5 !== peg$FAILED) {
	                  peg$reportedPos = s0;
	                  s1 = peg$c20(s1, s5);
	                  s0 = s1;
	                } else {
	                  peg$currPos = s0;
	                  s0 = peg$c2;
	                }
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsekey() {
	      var s0, s1, s2;
	
	      var key    = peg$currPos * 49 + 10,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = [];
	      s2 = peg$parseASCII_BASIC();
	      if (s2 !== peg$FAILED) {
	        while (s2 !== peg$FAILED) {
	          s1.push(s2);
	          s2 = peg$parseASCII_BASIC();
	        }
	      } else {
	        s1 = peg$c2;
	      }
	      if (s1 !== peg$FAILED) {
	        peg$reportedPos = s0;
	        s1 = peg$c21(s1);
	      }
	      s0 = s1;
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsequoted_key() {
	      var s0, s1;
	
	      var key    = peg$currPos * 49 + 11,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = peg$parsedouble_quoted_single_line_string();
	      if (s1 !== peg$FAILED) {
	        peg$reportedPos = s0;
	        s1 = peg$c22(s1);
	      }
	      s0 = s1;
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = peg$parsesingle_quoted_single_line_string();
	        if (s1 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c22(s1);
	        }
	        s0 = s1;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsevalue() {
	      var s0;
	
	      var key    = peg$currPos * 49 + 12,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$parsestring();
	      if (s0 === peg$FAILED) {
	        s0 = peg$parsedatetime();
	        if (s0 === peg$FAILED) {
	          s0 = peg$parsefloat();
	          if (s0 === peg$FAILED) {
	            s0 = peg$parseinteger();
	            if (s0 === peg$FAILED) {
	              s0 = peg$parseboolean();
	              if (s0 === peg$FAILED) {
	                s0 = peg$parsearray();
	                if (s0 === peg$FAILED) {
	                  s0 = peg$parseinline_table();
	                }
	              }
	            }
	          }
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsestring() {
	      var s0;
	
	      var key    = peg$currPos * 49 + 13,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$parsedouble_quoted_multiline_string();
	      if (s0 === peg$FAILED) {
	        s0 = peg$parsedouble_quoted_single_line_string();
	        if (s0 === peg$FAILED) {
	          s0 = peg$parsesingle_quoted_multiline_string();
	          if (s0 === peg$FAILED) {
	            s0 = peg$parsesingle_quoted_single_line_string();
	          }
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsedouble_quoted_multiline_string() {
	      var s0, s1, s2, s3, s4;
	
	      var key    = peg$currPos * 49 + 14,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.substr(peg$currPos, 3) === peg$c23) {
	        s1 = peg$c23;
	        peg$currPos += 3;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c24); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parseNL();
	        if (s2 === peg$FAILED) {
	          s2 = peg$c25;
	        }
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parsemultiline_string_char();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parsemultiline_string_char();
	          }
	          if (s3 !== peg$FAILED) {
	            if (input.substr(peg$currPos, 3) === peg$c23) {
	              s4 = peg$c23;
	              peg$currPos += 3;
	            } else {
	              s4 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c24); }
	            }
	            if (s4 !== peg$FAILED) {
	              peg$reportedPos = s0;
	              s1 = peg$c26(s3);
	              s0 = s1;
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsedouble_quoted_single_line_string() {
	      var s0, s1, s2, s3;
	
	      var key    = peg$currPos * 49 + 15,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 34) {
	        s1 = peg$c27;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c28); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = [];
	        s3 = peg$parsestring_char();
	        while (s3 !== peg$FAILED) {
	          s2.push(s3);
	          s3 = peg$parsestring_char();
	        }
	        if (s2 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 34) {
	            s3 = peg$c27;
	            peg$currPos++;
	          } else {
	            s3 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c28); }
	          }
	          if (s3 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c26(s2);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsesingle_quoted_multiline_string() {
	      var s0, s1, s2, s3, s4;
	
	      var key    = peg$currPos * 49 + 16,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.substr(peg$currPos, 3) === peg$c29) {
	        s1 = peg$c29;
	        peg$currPos += 3;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c30); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parseNL();
	        if (s2 === peg$FAILED) {
	          s2 = peg$c25;
	        }
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parsemultiline_literal_char();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parsemultiline_literal_char();
	          }
	          if (s3 !== peg$FAILED) {
	            if (input.substr(peg$currPos, 3) === peg$c29) {
	              s4 = peg$c29;
	              peg$currPos += 3;
	            } else {
	              s4 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c30); }
	            }
	            if (s4 !== peg$FAILED) {
	              peg$reportedPos = s0;
	              s1 = peg$c26(s3);
	              s0 = s1;
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsesingle_quoted_single_line_string() {
	      var s0, s1, s2, s3;
	
	      var key    = peg$currPos * 49 + 17,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 39) {
	        s1 = peg$c31;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c32); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = [];
	        s3 = peg$parseliteral_char();
	        while (s3 !== peg$FAILED) {
	          s2.push(s3);
	          s3 = peg$parseliteral_char();
	        }
	        if (s2 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 39) {
	            s3 = peg$c31;
	            peg$currPos++;
	          } else {
	            s3 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c32); }
	          }
	          if (s3 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c26(s2);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsestring_char() {
	      var s0, s1, s2;
	
	      var key    = peg$currPos * 49 + 18,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$parseESCAPED();
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = peg$currPos;
	        peg$silentFails++;
	        if (input.charCodeAt(peg$currPos) === 34) {
	          s2 = peg$c27;
	          peg$currPos++;
	        } else {
	          s2 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c28); }
	        }
	        peg$silentFails--;
	        if (s2 === peg$FAILED) {
	          s1 = peg$c5;
	        } else {
	          peg$currPos = s1;
	          s1 = peg$c2;
	        }
	        if (s1 !== peg$FAILED) {
	          if (input.length > peg$currPos) {
	            s2 = input.charAt(peg$currPos);
	            peg$currPos++;
	          } else {
	            s2 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c6); }
	          }
	          if (s2 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c33(s2);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseliteral_char() {
	      var s0, s1, s2;
	
	      var key    = peg$currPos * 49 + 19,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = peg$currPos;
	      peg$silentFails++;
	      if (input.charCodeAt(peg$currPos) === 39) {
	        s2 = peg$c31;
	        peg$currPos++;
	      } else {
	        s2 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c32); }
	      }
	      peg$silentFails--;
	      if (s2 === peg$FAILED) {
	        s1 = peg$c5;
	      } else {
	        peg$currPos = s1;
	        s1 = peg$c2;
	      }
	      if (s1 !== peg$FAILED) {
	        if (input.length > peg$currPos) {
	          s2 = input.charAt(peg$currPos);
	          peg$currPos++;
	        } else {
	          s2 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c6); }
	        }
	        if (s2 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c33(s2);
	          s0 = s1;
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsemultiline_string_char() {
	      var s0, s1, s2;
	
	      var key    = peg$currPos * 49 + 20,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$parseESCAPED();
	      if (s0 === peg$FAILED) {
	        s0 = peg$parsemultiline_string_delim();
	        if (s0 === peg$FAILED) {
	          s0 = peg$currPos;
	          s1 = peg$currPos;
	          peg$silentFails++;
	          if (input.substr(peg$currPos, 3) === peg$c23) {
	            s2 = peg$c23;
	            peg$currPos += 3;
	          } else {
	            s2 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c24); }
	          }
	          peg$silentFails--;
	          if (s2 === peg$FAILED) {
	            s1 = peg$c5;
	          } else {
	            peg$currPos = s1;
	            s1 = peg$c2;
	          }
	          if (s1 !== peg$FAILED) {
	            if (input.length > peg$currPos) {
	              s2 = input.charAt(peg$currPos);
	              peg$currPos++;
	            } else {
	              s2 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c6); }
	            }
	            if (s2 !== peg$FAILED) {
	              peg$reportedPos = s0;
	              s1 = peg$c34(s2);
	              s0 = s1;
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsemultiline_string_delim() {
	      var s0, s1, s2, s3, s4;
	
	      var key    = peg$currPos * 49 + 21,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 92) {
	        s1 = peg$c35;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c36); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parseNL();
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parseNLS();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parseNLS();
	          }
	          if (s3 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c37();
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsemultiline_literal_char() {
	      var s0, s1, s2;
	
	      var key    = peg$currPos * 49 + 22,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = peg$currPos;
	      peg$silentFails++;
	      if (input.substr(peg$currPos, 3) === peg$c29) {
	        s2 = peg$c29;
	        peg$currPos += 3;
	      } else {
	        s2 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c30); }
	      }
	      peg$silentFails--;
	      if (s2 === peg$FAILED) {
	        s1 = peg$c5;
	      } else {
	        peg$currPos = s1;
	        s1 = peg$c2;
	      }
	      if (s1 !== peg$FAILED) {
	        if (input.length > peg$currPos) {
	          s2 = input.charAt(peg$currPos);
	          peg$currPos++;
	        } else {
	          s2 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c6); }
	        }
	        if (s2 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c33(s2);
	          s0 = s1;
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsefloat() {
	      var s0, s1, s2, s3;
	
	      var key    = peg$currPos * 49 + 23,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = peg$parsefloat_text();
	      if (s1 === peg$FAILED) {
	        s1 = peg$parseinteger_text();
	      }
	      if (s1 !== peg$FAILED) {
	        if (input.charCodeAt(peg$currPos) === 101) {
	          s2 = peg$c38;
	          peg$currPos++;
	        } else {
	          s2 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c39); }
	        }
	        if (s2 === peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 69) {
	            s2 = peg$c40;
	            peg$currPos++;
	          } else {
	            s2 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c41); }
	          }
	        }
	        if (s2 !== peg$FAILED) {
	          s3 = peg$parseinteger_text();
	          if (s3 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c42(s1, s3);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = peg$parsefloat_text();
	        if (s1 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c43(s1);
	        }
	        s0 = s1;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsefloat_text() {
	      var s0, s1, s2, s3, s4, s5;
	
	      var key    = peg$currPos * 49 + 24,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 43) {
	        s1 = peg$c44;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c45); }
	      }
	      if (s1 === peg$FAILED) {
	        s1 = peg$c25;
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$currPos;
	        s3 = peg$parseDIGITS();
	        if (s3 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 46) {
	            s4 = peg$c16;
	            peg$currPos++;
	          } else {
	            s4 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c17); }
	          }
	          if (s4 !== peg$FAILED) {
	            s5 = peg$parseDIGITS();
	            if (s5 !== peg$FAILED) {
	              s3 = [s3, s4, s5];
	              s2 = s3;
	            } else {
	              peg$currPos = s2;
	              s2 = peg$c2;
	            }
	          } else {
	            peg$currPos = s2;
	            s2 = peg$c2;
	          }
	        } else {
	          peg$currPos = s2;
	          s2 = peg$c2;
	        }
	        if (s2 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c46(s2);
	          s0 = s1;
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        if (input.charCodeAt(peg$currPos) === 45) {
	          s1 = peg$c47;
	          peg$currPos++;
	        } else {
	          s1 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c48); }
	        }
	        if (s1 !== peg$FAILED) {
	          s2 = peg$currPos;
	          s3 = peg$parseDIGITS();
	          if (s3 !== peg$FAILED) {
	            if (input.charCodeAt(peg$currPos) === 46) {
	              s4 = peg$c16;
	              peg$currPos++;
	            } else {
	              s4 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c17); }
	            }
	            if (s4 !== peg$FAILED) {
	              s5 = peg$parseDIGITS();
	              if (s5 !== peg$FAILED) {
	                s3 = [s3, s4, s5];
	                s2 = s3;
	              } else {
	                peg$currPos = s2;
	                s2 = peg$c2;
	              }
	            } else {
	              peg$currPos = s2;
	              s2 = peg$c2;
	            }
	          } else {
	            peg$currPos = s2;
	            s2 = peg$c2;
	          }
	          if (s2 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c49(s2);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseinteger() {
	      var s0, s1;
	
	      var key    = peg$currPos * 49 + 25,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = peg$parseinteger_text();
	      if (s1 !== peg$FAILED) {
	        peg$reportedPos = s0;
	        s1 = peg$c50(s1);
	      }
	      s0 = s1;
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseinteger_text() {
	      var s0, s1, s2, s3, s4;
	
	      var key    = peg$currPos * 49 + 26,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 43) {
	        s1 = peg$c44;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c45); }
	      }
	      if (s1 === peg$FAILED) {
	        s1 = peg$c25;
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = [];
	        s3 = peg$parseDIGIT_OR_UNDER();
	        if (s3 !== peg$FAILED) {
	          while (s3 !== peg$FAILED) {
	            s2.push(s3);
	            s3 = peg$parseDIGIT_OR_UNDER();
	          }
	        } else {
	          s2 = peg$c2;
	        }
	        if (s2 !== peg$FAILED) {
	          s3 = peg$currPos;
	          peg$silentFails++;
	          if (input.charCodeAt(peg$currPos) === 46) {
	            s4 = peg$c16;
	            peg$currPos++;
	          } else {
	            s4 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c17); }
	          }
	          peg$silentFails--;
	          if (s4 === peg$FAILED) {
	            s3 = peg$c5;
	          } else {
	            peg$currPos = s3;
	            s3 = peg$c2;
	          }
	          if (s3 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c46(s2);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        if (input.charCodeAt(peg$currPos) === 45) {
	          s1 = peg$c47;
	          peg$currPos++;
	        } else {
	          s1 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c48); }
	        }
	        if (s1 !== peg$FAILED) {
	          s2 = [];
	          s3 = peg$parseDIGIT_OR_UNDER();
	          if (s3 !== peg$FAILED) {
	            while (s3 !== peg$FAILED) {
	              s2.push(s3);
	              s3 = peg$parseDIGIT_OR_UNDER();
	            }
	          } else {
	            s2 = peg$c2;
	          }
	          if (s2 !== peg$FAILED) {
	            s3 = peg$currPos;
	            peg$silentFails++;
	            if (input.charCodeAt(peg$currPos) === 46) {
	              s4 = peg$c16;
	              peg$currPos++;
	            } else {
	              s4 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c17); }
	            }
	            peg$silentFails--;
	            if (s4 === peg$FAILED) {
	              s3 = peg$c5;
	            } else {
	              peg$currPos = s3;
	              s3 = peg$c2;
	            }
	            if (s3 !== peg$FAILED) {
	              peg$reportedPos = s0;
	              s1 = peg$c49(s2);
	              s0 = s1;
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseboolean() {
	      var s0, s1;
	
	      var key    = peg$currPos * 49 + 27,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.substr(peg$currPos, 4) === peg$c51) {
	        s1 = peg$c51;
	        peg$currPos += 4;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c52); }
	      }
	      if (s1 !== peg$FAILED) {
	        peg$reportedPos = s0;
	        s1 = peg$c53();
	      }
	      s0 = s1;
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        if (input.substr(peg$currPos, 5) === peg$c54) {
	          s1 = peg$c54;
	          peg$currPos += 5;
	        } else {
	          s1 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c55); }
	        }
	        if (s1 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c56();
	        }
	        s0 = s1;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsearray() {
	      var s0, s1, s2, s3, s4;
	
	      var key    = peg$currPos * 49 + 28,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 91) {
	        s1 = peg$c7;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c8); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = [];
	        s3 = peg$parsearray_sep();
	        while (s3 !== peg$FAILED) {
	          s2.push(s3);
	          s3 = peg$parsearray_sep();
	        }
	        if (s2 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 93) {
	            s3 = peg$c9;
	            peg$currPos++;
	          } else {
	            s3 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c10); }
	          }
	          if (s3 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c57();
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        if (input.charCodeAt(peg$currPos) === 91) {
	          s1 = peg$c7;
	          peg$currPos++;
	        } else {
	          s1 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c8); }
	        }
	        if (s1 !== peg$FAILED) {
	          s2 = peg$parsearray_value();
	          if (s2 === peg$FAILED) {
	            s2 = peg$c25;
	          }
	          if (s2 !== peg$FAILED) {
	            if (input.charCodeAt(peg$currPos) === 93) {
	              s3 = peg$c9;
	              peg$currPos++;
	            } else {
	              s3 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c10); }
	            }
	            if (s3 !== peg$FAILED) {
	              peg$reportedPos = s0;
	              s1 = peg$c58(s2);
	              s0 = s1;
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	        if (s0 === peg$FAILED) {
	          s0 = peg$currPos;
	          if (input.charCodeAt(peg$currPos) === 91) {
	            s1 = peg$c7;
	            peg$currPos++;
	          } else {
	            s1 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c8); }
	          }
	          if (s1 !== peg$FAILED) {
	            s2 = [];
	            s3 = peg$parsearray_value_list();
	            if (s3 !== peg$FAILED) {
	              while (s3 !== peg$FAILED) {
	                s2.push(s3);
	                s3 = peg$parsearray_value_list();
	              }
	            } else {
	              s2 = peg$c2;
	            }
	            if (s2 !== peg$FAILED) {
	              if (input.charCodeAt(peg$currPos) === 93) {
	                s3 = peg$c9;
	                peg$currPos++;
	              } else {
	                s3 = peg$FAILED;
	                if (peg$silentFails === 0) { peg$fail(peg$c10); }
	              }
	              if (s3 !== peg$FAILED) {
	                peg$reportedPos = s0;
	                s1 = peg$c59(s2);
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	          if (s0 === peg$FAILED) {
	            s0 = peg$currPos;
	            if (input.charCodeAt(peg$currPos) === 91) {
	              s1 = peg$c7;
	              peg$currPos++;
	            } else {
	              s1 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c8); }
	            }
	            if (s1 !== peg$FAILED) {
	              s2 = [];
	              s3 = peg$parsearray_value_list();
	              if (s3 !== peg$FAILED) {
	                while (s3 !== peg$FAILED) {
	                  s2.push(s3);
	                  s3 = peg$parsearray_value_list();
	                }
	              } else {
	                s2 = peg$c2;
	              }
	              if (s2 !== peg$FAILED) {
	                s3 = peg$parsearray_value();
	                if (s3 !== peg$FAILED) {
	                  if (input.charCodeAt(peg$currPos) === 93) {
	                    s4 = peg$c9;
	                    peg$currPos++;
	                  } else {
	                    s4 = peg$FAILED;
	                    if (peg$silentFails === 0) { peg$fail(peg$c10); }
	                  }
	                  if (s4 !== peg$FAILED) {
	                    peg$reportedPos = s0;
	                    s1 = peg$c60(s2, s3);
	                    s0 = s1;
	                  } else {
	                    peg$currPos = s0;
	                    s0 = peg$c2;
	                  }
	                } else {
	                  peg$currPos = s0;
	                  s0 = peg$c2;
	                }
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          }
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsearray_value() {
	      var s0, s1, s2, s3, s4;
	
	      var key    = peg$currPos * 49 + 29,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = [];
	      s2 = peg$parsearray_sep();
	      while (s2 !== peg$FAILED) {
	        s1.push(s2);
	        s2 = peg$parsearray_sep();
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parsevalue();
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parsearray_sep();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parsearray_sep();
	          }
	          if (s3 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c61(s2);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsearray_value_list() {
	      var s0, s1, s2, s3, s4, s5, s6;
	
	      var key    = peg$currPos * 49 + 30,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = [];
	      s2 = peg$parsearray_sep();
	      while (s2 !== peg$FAILED) {
	        s1.push(s2);
	        s2 = peg$parsearray_sep();
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parsevalue();
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parsearray_sep();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parsearray_sep();
	          }
	          if (s3 !== peg$FAILED) {
	            if (input.charCodeAt(peg$currPos) === 44) {
	              s4 = peg$c62;
	              peg$currPos++;
	            } else {
	              s4 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c63); }
	            }
	            if (s4 !== peg$FAILED) {
	              s5 = [];
	              s6 = peg$parsearray_sep();
	              while (s6 !== peg$FAILED) {
	                s5.push(s6);
	                s6 = peg$parsearray_sep();
	              }
	              if (s5 !== peg$FAILED) {
	                peg$reportedPos = s0;
	                s1 = peg$c61(s2);
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsearray_sep() {
	      var s0;
	
	      var key    = peg$currPos * 49 + 31,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$parseS();
	      if (s0 === peg$FAILED) {
	        s0 = peg$parseNL();
	        if (s0 === peg$FAILED) {
	          s0 = peg$parsecomment();
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseinline_table() {
	      var s0, s1, s2, s3, s4, s5;
	
	      var key    = peg$currPos * 49 + 32,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 123) {
	        s1 = peg$c64;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c65); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = [];
	        s3 = peg$parseS();
	        while (s3 !== peg$FAILED) {
	          s2.push(s3);
	          s3 = peg$parseS();
	        }
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parseinline_table_assignment();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parseinline_table_assignment();
	          }
	          if (s3 !== peg$FAILED) {
	            s4 = [];
	            s5 = peg$parseS();
	            while (s5 !== peg$FAILED) {
	              s4.push(s5);
	              s5 = peg$parseS();
	            }
	            if (s4 !== peg$FAILED) {
	              if (input.charCodeAt(peg$currPos) === 125) {
	                s5 = peg$c66;
	                peg$currPos++;
	              } else {
	                s5 = peg$FAILED;
	                if (peg$silentFails === 0) { peg$fail(peg$c67); }
	              }
	              if (s5 !== peg$FAILED) {
	                peg$reportedPos = s0;
	                s1 = peg$c68(s3);
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseinline_table_assignment() {
	      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;
	
	      var key    = peg$currPos * 49 + 33,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = [];
	      s2 = peg$parseS();
	      while (s2 !== peg$FAILED) {
	        s1.push(s2);
	        s2 = peg$parseS();
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parsekey();
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          s4 = peg$parseS();
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            s4 = peg$parseS();
	          }
	          if (s3 !== peg$FAILED) {
	            if (input.charCodeAt(peg$currPos) === 61) {
	              s4 = peg$c18;
	              peg$currPos++;
	            } else {
	              s4 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c19); }
	            }
	            if (s4 !== peg$FAILED) {
	              s5 = [];
	              s6 = peg$parseS();
	              while (s6 !== peg$FAILED) {
	                s5.push(s6);
	                s6 = peg$parseS();
	              }
	              if (s5 !== peg$FAILED) {
	                s6 = peg$parsevalue();
	                if (s6 !== peg$FAILED) {
	                  s7 = [];
	                  s8 = peg$parseS();
	                  while (s8 !== peg$FAILED) {
	                    s7.push(s8);
	                    s8 = peg$parseS();
	                  }
	                  if (s7 !== peg$FAILED) {
	                    if (input.charCodeAt(peg$currPos) === 44) {
	                      s8 = peg$c62;
	                      peg$currPos++;
	                    } else {
	                      s8 = peg$FAILED;
	                      if (peg$silentFails === 0) { peg$fail(peg$c63); }
	                    }
	                    if (s8 !== peg$FAILED) {
	                      s9 = [];
	                      s10 = peg$parseS();
	                      while (s10 !== peg$FAILED) {
	                        s9.push(s10);
	                        s10 = peg$parseS();
	                      }
	                      if (s9 !== peg$FAILED) {
	                        peg$reportedPos = s0;
	                        s1 = peg$c69(s2, s6);
	                        s0 = s1;
	                      } else {
	                        peg$currPos = s0;
	                        s0 = peg$c2;
	                      }
	                    } else {
	                      peg$currPos = s0;
	                      s0 = peg$c2;
	                    }
	                  } else {
	                    peg$currPos = s0;
	                    s0 = peg$c2;
	                  }
	                } else {
	                  peg$currPos = s0;
	                  s0 = peg$c2;
	                }
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = [];
	        s2 = peg$parseS();
	        while (s2 !== peg$FAILED) {
	          s1.push(s2);
	          s2 = peg$parseS();
	        }
	        if (s1 !== peg$FAILED) {
	          s2 = peg$parsekey();
	          if (s2 !== peg$FAILED) {
	            s3 = [];
	            s4 = peg$parseS();
	            while (s4 !== peg$FAILED) {
	              s3.push(s4);
	              s4 = peg$parseS();
	            }
	            if (s3 !== peg$FAILED) {
	              if (input.charCodeAt(peg$currPos) === 61) {
	                s4 = peg$c18;
	                peg$currPos++;
	              } else {
	                s4 = peg$FAILED;
	                if (peg$silentFails === 0) { peg$fail(peg$c19); }
	              }
	              if (s4 !== peg$FAILED) {
	                s5 = [];
	                s6 = peg$parseS();
	                while (s6 !== peg$FAILED) {
	                  s5.push(s6);
	                  s6 = peg$parseS();
	                }
	                if (s5 !== peg$FAILED) {
	                  s6 = peg$parsevalue();
	                  if (s6 !== peg$FAILED) {
	                    peg$reportedPos = s0;
	                    s1 = peg$c69(s2, s6);
	                    s0 = s1;
	                  } else {
	                    peg$currPos = s0;
	                    s0 = peg$c2;
	                  }
	                } else {
	                  peg$currPos = s0;
	                  s0 = peg$c2;
	                }
	              } else {
	                peg$currPos = s0;
	                s0 = peg$c2;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsesecfragment() {
	      var s0, s1, s2;
	
	      var key    = peg$currPos * 49 + 34,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.charCodeAt(peg$currPos) === 46) {
	        s1 = peg$c16;
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c17); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parseDIGITS();
	        if (s2 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c70(s2);
	          s0 = s1;
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsedate() {
	      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;
	
	      var key    = peg$currPos * 49 + 35,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = peg$currPos;
	      s2 = peg$parseDIGIT_OR_UNDER();
	      if (s2 !== peg$FAILED) {
	        s3 = peg$parseDIGIT_OR_UNDER();
	        if (s3 !== peg$FAILED) {
	          s4 = peg$parseDIGIT_OR_UNDER();
	          if (s4 !== peg$FAILED) {
	            s5 = peg$parseDIGIT_OR_UNDER();
	            if (s5 !== peg$FAILED) {
	              if (input.charCodeAt(peg$currPos) === 45) {
	                s6 = peg$c47;
	                peg$currPos++;
	              } else {
	                s6 = peg$FAILED;
	                if (peg$silentFails === 0) { peg$fail(peg$c48); }
	              }
	              if (s6 !== peg$FAILED) {
	                s7 = peg$parseDIGIT_OR_UNDER();
	                if (s7 !== peg$FAILED) {
	                  s8 = peg$parseDIGIT_OR_UNDER();
	                  if (s8 !== peg$FAILED) {
	                    if (input.charCodeAt(peg$currPos) === 45) {
	                      s9 = peg$c47;
	                      peg$currPos++;
	                    } else {
	                      s9 = peg$FAILED;
	                      if (peg$silentFails === 0) { peg$fail(peg$c48); }
	                    }
	                    if (s9 !== peg$FAILED) {
	                      s10 = peg$parseDIGIT_OR_UNDER();
	                      if (s10 !== peg$FAILED) {
	                        s11 = peg$parseDIGIT_OR_UNDER();
	                        if (s11 !== peg$FAILED) {
	                          s2 = [s2, s3, s4, s5, s6, s7, s8, s9, s10, s11];
	                          s1 = s2;
	                        } else {
	                          peg$currPos = s1;
	                          s1 = peg$c2;
	                        }
	                      } else {
	                        peg$currPos = s1;
	                        s1 = peg$c2;
	                      }
	                    } else {
	                      peg$currPos = s1;
	                      s1 = peg$c2;
	                    }
	                  } else {
	                    peg$currPos = s1;
	                    s1 = peg$c2;
	                  }
	                } else {
	                  peg$currPos = s1;
	                  s1 = peg$c2;
	                }
	              } else {
	                peg$currPos = s1;
	                s1 = peg$c2;
	              }
	            } else {
	              peg$currPos = s1;
	              s1 = peg$c2;
	            }
	          } else {
	            peg$currPos = s1;
	            s1 = peg$c2;
	          }
	        } else {
	          peg$currPos = s1;
	          s1 = peg$c2;
	        }
	      } else {
	        peg$currPos = s1;
	        s1 = peg$c2;
	      }
	      if (s1 !== peg$FAILED) {
	        peg$reportedPos = s0;
	        s1 = peg$c71(s1);
	      }
	      s0 = s1;
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsetime() {
	      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;
	
	      var key    = peg$currPos * 49 + 36,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = peg$currPos;
	      s2 = peg$parseDIGIT_OR_UNDER();
	      if (s2 !== peg$FAILED) {
	        s3 = peg$parseDIGIT_OR_UNDER();
	        if (s3 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 58) {
	            s4 = peg$c72;
	            peg$currPos++;
	          } else {
	            s4 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c73); }
	          }
	          if (s4 !== peg$FAILED) {
	            s5 = peg$parseDIGIT_OR_UNDER();
	            if (s5 !== peg$FAILED) {
	              s6 = peg$parseDIGIT_OR_UNDER();
	              if (s6 !== peg$FAILED) {
	                if (input.charCodeAt(peg$currPos) === 58) {
	                  s7 = peg$c72;
	                  peg$currPos++;
	                } else {
	                  s7 = peg$FAILED;
	                  if (peg$silentFails === 0) { peg$fail(peg$c73); }
	                }
	                if (s7 !== peg$FAILED) {
	                  s8 = peg$parseDIGIT_OR_UNDER();
	                  if (s8 !== peg$FAILED) {
	                    s9 = peg$parseDIGIT_OR_UNDER();
	                    if (s9 !== peg$FAILED) {
	                      s10 = peg$parsesecfragment();
	                      if (s10 === peg$FAILED) {
	                        s10 = peg$c25;
	                      }
	                      if (s10 !== peg$FAILED) {
	                        s2 = [s2, s3, s4, s5, s6, s7, s8, s9, s10];
	                        s1 = s2;
	                      } else {
	                        peg$currPos = s1;
	                        s1 = peg$c2;
	                      }
	                    } else {
	                      peg$currPos = s1;
	                      s1 = peg$c2;
	                    }
	                  } else {
	                    peg$currPos = s1;
	                    s1 = peg$c2;
	                  }
	                } else {
	                  peg$currPos = s1;
	                  s1 = peg$c2;
	                }
	              } else {
	                peg$currPos = s1;
	                s1 = peg$c2;
	              }
	            } else {
	              peg$currPos = s1;
	              s1 = peg$c2;
	            }
	          } else {
	            peg$currPos = s1;
	            s1 = peg$c2;
	          }
	        } else {
	          peg$currPos = s1;
	          s1 = peg$c2;
	        }
	      } else {
	        peg$currPos = s1;
	        s1 = peg$c2;
	      }
	      if (s1 !== peg$FAILED) {
	        peg$reportedPos = s0;
	        s1 = peg$c74(s1);
	      }
	      s0 = s1;
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsetime_with_offset() {
	      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16;
	
	      var key    = peg$currPos * 49 + 37,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = peg$currPos;
	      s2 = peg$parseDIGIT_OR_UNDER();
	      if (s2 !== peg$FAILED) {
	        s3 = peg$parseDIGIT_OR_UNDER();
	        if (s3 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 58) {
	            s4 = peg$c72;
	            peg$currPos++;
	          } else {
	            s4 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c73); }
	          }
	          if (s4 !== peg$FAILED) {
	            s5 = peg$parseDIGIT_OR_UNDER();
	            if (s5 !== peg$FAILED) {
	              s6 = peg$parseDIGIT_OR_UNDER();
	              if (s6 !== peg$FAILED) {
	                if (input.charCodeAt(peg$currPos) === 58) {
	                  s7 = peg$c72;
	                  peg$currPos++;
	                } else {
	                  s7 = peg$FAILED;
	                  if (peg$silentFails === 0) { peg$fail(peg$c73); }
	                }
	                if (s7 !== peg$FAILED) {
	                  s8 = peg$parseDIGIT_OR_UNDER();
	                  if (s8 !== peg$FAILED) {
	                    s9 = peg$parseDIGIT_OR_UNDER();
	                    if (s9 !== peg$FAILED) {
	                      s10 = peg$parsesecfragment();
	                      if (s10 === peg$FAILED) {
	                        s10 = peg$c25;
	                      }
	                      if (s10 !== peg$FAILED) {
	                        if (input.charCodeAt(peg$currPos) === 45) {
	                          s11 = peg$c47;
	                          peg$currPos++;
	                        } else {
	                          s11 = peg$FAILED;
	                          if (peg$silentFails === 0) { peg$fail(peg$c48); }
	                        }
	                        if (s11 === peg$FAILED) {
	                          if (input.charCodeAt(peg$currPos) === 43) {
	                            s11 = peg$c44;
	                            peg$currPos++;
	                          } else {
	                            s11 = peg$FAILED;
	                            if (peg$silentFails === 0) { peg$fail(peg$c45); }
	                          }
	                        }
	                        if (s11 !== peg$FAILED) {
	                          s12 = peg$parseDIGIT_OR_UNDER();
	                          if (s12 !== peg$FAILED) {
	                            s13 = peg$parseDIGIT_OR_UNDER();
	                            if (s13 !== peg$FAILED) {
	                              if (input.charCodeAt(peg$currPos) === 58) {
	                                s14 = peg$c72;
	                                peg$currPos++;
	                              } else {
	                                s14 = peg$FAILED;
	                                if (peg$silentFails === 0) { peg$fail(peg$c73); }
	                              }
	                              if (s14 !== peg$FAILED) {
	                                s15 = peg$parseDIGIT_OR_UNDER();
	                                if (s15 !== peg$FAILED) {
	                                  s16 = peg$parseDIGIT_OR_UNDER();
	                                  if (s16 !== peg$FAILED) {
	                                    s2 = [s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16];
	                                    s1 = s2;
	                                  } else {
	                                    peg$currPos = s1;
	                                    s1 = peg$c2;
	                                  }
	                                } else {
	                                  peg$currPos = s1;
	                                  s1 = peg$c2;
	                                }
	                              } else {
	                                peg$currPos = s1;
	                                s1 = peg$c2;
	                              }
	                            } else {
	                              peg$currPos = s1;
	                              s1 = peg$c2;
	                            }
	                          } else {
	                            peg$currPos = s1;
	                            s1 = peg$c2;
	                          }
	                        } else {
	                          peg$currPos = s1;
	                          s1 = peg$c2;
	                        }
	                      } else {
	                        peg$currPos = s1;
	                        s1 = peg$c2;
	                      }
	                    } else {
	                      peg$currPos = s1;
	                      s1 = peg$c2;
	                    }
	                  } else {
	                    peg$currPos = s1;
	                    s1 = peg$c2;
	                  }
	                } else {
	                  peg$currPos = s1;
	                  s1 = peg$c2;
	                }
	              } else {
	                peg$currPos = s1;
	                s1 = peg$c2;
	              }
	            } else {
	              peg$currPos = s1;
	              s1 = peg$c2;
	            }
	          } else {
	            peg$currPos = s1;
	            s1 = peg$c2;
	          }
	        } else {
	          peg$currPos = s1;
	          s1 = peg$c2;
	        }
	      } else {
	        peg$currPos = s1;
	        s1 = peg$c2;
	      }
	      if (s1 !== peg$FAILED) {
	        peg$reportedPos = s0;
	        s1 = peg$c74(s1);
	      }
	      s0 = s1;
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parsedatetime() {
	      var s0, s1, s2, s3, s4;
	
	      var key    = peg$currPos * 49 + 38,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = peg$parsedate();
	      if (s1 !== peg$FAILED) {
	        if (input.charCodeAt(peg$currPos) === 84) {
	          s2 = peg$c75;
	          peg$currPos++;
	        } else {
	          s2 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c76); }
	        }
	        if (s2 !== peg$FAILED) {
	          s3 = peg$parsetime();
	          if (s3 !== peg$FAILED) {
	            if (input.charCodeAt(peg$currPos) === 90) {
	              s4 = peg$c77;
	              peg$currPos++;
	            } else {
	              s4 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c78); }
	            }
	            if (s4 !== peg$FAILED) {
	              peg$reportedPos = s0;
	              s1 = peg$c79(s1, s3);
	              s0 = s1;
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = peg$parsedate();
	        if (s1 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 84) {
	            s2 = peg$c75;
	            peg$currPos++;
	          } else {
	            s2 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c76); }
	          }
	          if (s2 !== peg$FAILED) {
	            s3 = peg$parsetime_with_offset();
	            if (s3 !== peg$FAILED) {
	              peg$reportedPos = s0;
	              s1 = peg$c80(s1, s3);
	              s0 = s1;
	            } else {
	              peg$currPos = s0;
	              s0 = peg$c2;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseS() {
	      var s0;
	
	      var key    = peg$currPos * 49 + 39,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      if (peg$c81.test(input.charAt(peg$currPos))) {
	        s0 = input.charAt(peg$currPos);
	        peg$currPos++;
	      } else {
	        s0 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c82); }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseNL() {
	      var s0, s1, s2;
	
	      var key    = peg$currPos * 49 + 40,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      if (input.charCodeAt(peg$currPos) === 10) {
	        s0 = peg$c83;
	        peg$currPos++;
	      } else {
	        s0 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c84); }
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        if (input.charCodeAt(peg$currPos) === 13) {
	          s1 = peg$c85;
	          peg$currPos++;
	        } else {
	          s1 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c86); }
	        }
	        if (s1 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 10) {
	            s2 = peg$c83;
	            peg$currPos++;
	          } else {
	            s2 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c84); }
	          }
	          if (s2 !== peg$FAILED) {
	            s1 = [s1, s2];
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseNLS() {
	      var s0;
	
	      var key    = peg$currPos * 49 + 41,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$parseNL();
	      if (s0 === peg$FAILED) {
	        s0 = peg$parseS();
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseEOF() {
	      var s0, s1;
	
	      var key    = peg$currPos * 49 + 42,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      peg$silentFails++;
	      if (input.length > peg$currPos) {
	        s1 = input.charAt(peg$currPos);
	        peg$currPos++;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c6); }
	      }
	      peg$silentFails--;
	      if (s1 === peg$FAILED) {
	        s0 = peg$c5;
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseHEX() {
	      var s0;
	
	      var key    = peg$currPos * 49 + 43,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      if (peg$c87.test(input.charAt(peg$currPos))) {
	        s0 = input.charAt(peg$currPos);
	        peg$currPos++;
	      } else {
	        s0 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c88); }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseDIGIT_OR_UNDER() {
	      var s0, s1;
	
	      var key    = peg$currPos * 49 + 44,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      if (peg$c89.test(input.charAt(peg$currPos))) {
	        s0 = input.charAt(peg$currPos);
	        peg$currPos++;
	      } else {
	        s0 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c90); }
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        if (input.charCodeAt(peg$currPos) === 95) {
	          s1 = peg$c91;
	          peg$currPos++;
	        } else {
	          s1 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c92); }
	        }
	        if (s1 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c93();
	        }
	        s0 = s1;
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseASCII_BASIC() {
	      var s0;
	
	      var key    = peg$currPos * 49 + 45,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      if (peg$c94.test(input.charAt(peg$currPos))) {
	        s0 = input.charAt(peg$currPos);
	        peg$currPos++;
	      } else {
	        s0 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c95); }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseDIGITS() {
	      var s0, s1, s2;
	
	      var key    = peg$currPos * 49 + 46,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      s1 = [];
	      s2 = peg$parseDIGIT_OR_UNDER();
	      if (s2 !== peg$FAILED) {
	        while (s2 !== peg$FAILED) {
	          s1.push(s2);
	          s2 = peg$parseDIGIT_OR_UNDER();
	        }
	      } else {
	        s1 = peg$c2;
	      }
	      if (s1 !== peg$FAILED) {
	        peg$reportedPos = s0;
	        s1 = peg$c96(s1);
	      }
	      s0 = s1;
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseESCAPED() {
	      var s0, s1;
	
	      var key    = peg$currPos * 49 + 47,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.substr(peg$currPos, 2) === peg$c97) {
	        s1 = peg$c97;
	        peg$currPos += 2;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c98); }
	      }
	      if (s1 !== peg$FAILED) {
	        peg$reportedPos = s0;
	        s1 = peg$c99();
	      }
	      s0 = s1;
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        if (input.substr(peg$currPos, 2) === peg$c100) {
	          s1 = peg$c100;
	          peg$currPos += 2;
	        } else {
	          s1 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c101); }
	        }
	        if (s1 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c102();
	        }
	        s0 = s1;
	        if (s0 === peg$FAILED) {
	          s0 = peg$currPos;
	          if (input.substr(peg$currPos, 2) === peg$c103) {
	            s1 = peg$c103;
	            peg$currPos += 2;
	          } else {
	            s1 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c104); }
	          }
	          if (s1 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c105();
	          }
	          s0 = s1;
	          if (s0 === peg$FAILED) {
	            s0 = peg$currPos;
	            if (input.substr(peg$currPos, 2) === peg$c106) {
	              s1 = peg$c106;
	              peg$currPos += 2;
	            } else {
	              s1 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c107); }
	            }
	            if (s1 !== peg$FAILED) {
	              peg$reportedPos = s0;
	              s1 = peg$c108();
	            }
	            s0 = s1;
	            if (s0 === peg$FAILED) {
	              s0 = peg$currPos;
	              if (input.substr(peg$currPos, 2) === peg$c109) {
	                s1 = peg$c109;
	                peg$currPos += 2;
	              } else {
	                s1 = peg$FAILED;
	                if (peg$silentFails === 0) { peg$fail(peg$c110); }
	              }
	              if (s1 !== peg$FAILED) {
	                peg$reportedPos = s0;
	                s1 = peg$c111();
	              }
	              s0 = s1;
	              if (s0 === peg$FAILED) {
	                s0 = peg$currPos;
	                if (input.substr(peg$currPos, 2) === peg$c112) {
	                  s1 = peg$c112;
	                  peg$currPos += 2;
	                } else {
	                  s1 = peg$FAILED;
	                  if (peg$silentFails === 0) { peg$fail(peg$c113); }
	                }
	                if (s1 !== peg$FAILED) {
	                  peg$reportedPos = s0;
	                  s1 = peg$c114();
	                }
	                s0 = s1;
	                if (s0 === peg$FAILED) {
	                  s0 = peg$currPos;
	                  if (input.substr(peg$currPos, 2) === peg$c115) {
	                    s1 = peg$c115;
	                    peg$currPos += 2;
	                  } else {
	                    s1 = peg$FAILED;
	                    if (peg$silentFails === 0) { peg$fail(peg$c116); }
	                  }
	                  if (s1 !== peg$FAILED) {
	                    peg$reportedPos = s0;
	                    s1 = peg$c117();
	                  }
	                  s0 = s1;
	                  if (s0 === peg$FAILED) {
	                    s0 = peg$parseESCAPED_UNICODE();
	                  }
	                }
	              }
	            }
	          }
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	    function peg$parseESCAPED_UNICODE() {
	      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;
	
	      var key    = peg$currPos * 49 + 48,
	          cached = peg$cache[key];
	
	      if (cached) {
	        peg$currPos = cached.nextPos;
	        return cached.result;
	      }
	
	      s0 = peg$currPos;
	      if (input.substr(peg$currPos, 2) === peg$c118) {
	        s1 = peg$c118;
	        peg$currPos += 2;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c119); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$currPos;
	        s3 = peg$parseHEX();
	        if (s3 !== peg$FAILED) {
	          s4 = peg$parseHEX();
	          if (s4 !== peg$FAILED) {
	            s5 = peg$parseHEX();
	            if (s5 !== peg$FAILED) {
	              s6 = peg$parseHEX();
	              if (s6 !== peg$FAILED) {
	                s7 = peg$parseHEX();
	                if (s7 !== peg$FAILED) {
	                  s8 = peg$parseHEX();
	                  if (s8 !== peg$FAILED) {
	                    s9 = peg$parseHEX();
	                    if (s9 !== peg$FAILED) {
	                      s10 = peg$parseHEX();
	                      if (s10 !== peg$FAILED) {
	                        s3 = [s3, s4, s5, s6, s7, s8, s9, s10];
	                        s2 = s3;
	                      } else {
	                        peg$currPos = s2;
	                        s2 = peg$c2;
	                      }
	                    } else {
	                      peg$currPos = s2;
	                      s2 = peg$c2;
	                    }
	                  } else {
	                    peg$currPos = s2;
	                    s2 = peg$c2;
	                  }
	                } else {
	                  peg$currPos = s2;
	                  s2 = peg$c2;
	                }
	              } else {
	                peg$currPos = s2;
	                s2 = peg$c2;
	              }
	            } else {
	              peg$currPos = s2;
	              s2 = peg$c2;
	            }
	          } else {
	            peg$currPos = s2;
	            s2 = peg$c2;
	          }
	        } else {
	          peg$currPos = s2;
	          s2 = peg$c2;
	        }
	        if (s2 !== peg$FAILED) {
	          peg$reportedPos = s0;
	          s1 = peg$c120(s2);
	          s0 = s1;
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$c2;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        if (input.substr(peg$currPos, 2) === peg$c121) {
	          s1 = peg$c121;
	          peg$currPos += 2;
	        } else {
	          s1 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c122); }
	        }
	        if (s1 !== peg$FAILED) {
	          s2 = peg$currPos;
	          s3 = peg$parseHEX();
	          if (s3 !== peg$FAILED) {
	            s4 = peg$parseHEX();
	            if (s4 !== peg$FAILED) {
	              s5 = peg$parseHEX();
	              if (s5 !== peg$FAILED) {
	                s6 = peg$parseHEX();
	                if (s6 !== peg$FAILED) {
	                  s3 = [s3, s4, s5, s6];
	                  s2 = s3;
	                } else {
	                  peg$currPos = s2;
	                  s2 = peg$c2;
	                }
	              } else {
	                peg$currPos = s2;
	                s2 = peg$c2;
	              }
	            } else {
	              peg$currPos = s2;
	              s2 = peg$c2;
	            }
	          } else {
	            peg$currPos = s2;
	            s2 = peg$c2;
	          }
	          if (s2 !== peg$FAILED) {
	            peg$reportedPos = s0;
	            s1 = peg$c120(s2);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$c2;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$c2;
	        }
	      }
	
	      peg$cache[key] = { nextPos: peg$currPos, result: s0 };
	
	      return s0;
	    }
	
	
	      var nodes = [];
	
	      function genError(err, line, col) {
	        var ex = new Error(err);
	        ex.line = line;
	        ex.column = col;
	        throw ex;
	      }
	
	      function addNode(node) {
	        nodes.push(node);
	      }
	
	      function node(type, value, line, column, key) {
	        var obj = { type: type, value: value, line: line(), column: column() };
	        if (key) obj.key = key;
	        return obj;
	      }
	
	      function convertCodePoint(str, line, col) {
	        var num = parseInt("0x" + str);
	
	        if (
	          !isFinite(num) ||
	          Math.floor(num) != num ||
	          num < 0 ||
	          num > 0x10FFFF ||
	          (num > 0xD7FF && num < 0xE000)
	        ) {
	          genError("Invalid Unicode escape code: " + str, line, col);
	        } else {
	          return fromCodePoint(num);
	        }
	      }
	
	      function fromCodePoint() {
	        var MAX_SIZE = 0x4000;
	        var codeUnits = [];
	        var highSurrogate;
	        var lowSurrogate;
	        var index = -1;
	        var length = arguments.length;
	        if (!length) {
	          return '';
	        }
	        var result = '';
	        while (++index < length) {
	          var codePoint = Number(arguments[index]);
	          if (codePoint <= 0xFFFF) { // BMP code point
	            codeUnits.push(codePoint);
	          } else { // Astral code point; split in surrogate halves
	            // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
	            codePoint -= 0x10000;
	            highSurrogate = (codePoint >> 10) + 0xD800;
	            lowSurrogate = (codePoint % 0x400) + 0xDC00;
	            codeUnits.push(highSurrogate, lowSurrogate);
	          }
	          if (index + 1 == length || codeUnits.length > MAX_SIZE) {
	            result += String.fromCharCode.apply(null, codeUnits);
	            codeUnits.length = 0;
	          }
	        }
	        return result;
	      }
	
	
	    peg$result = peg$startRuleFunction();
	
	    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
	      return peg$result;
	    } else {
	      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
	        peg$fail({ type: "end", description: "end of input" });
	      }
	
	      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
	    }
	  }
	
	  return {
	    SyntaxError: SyntaxError,
	    parse:       parse
	  };
	})();


/***/ }),
/* 10 */
/***/ (function(module, exports) {

	"use strict";
	function compile(nodes) {
	  var assignedPaths = [];
	  var valueAssignments = [];
	  var currentPath = "";
	  var data = {};
	  var context = data;
	  var arrayMode = false;
	
	  return reduce(nodes);
	
	  function reduce(nodes) {
	    var node;
	    for (var i = 0; i < nodes.length; i++) {
	      node = nodes[i];
	      switch (node.type) {
	      case "Assign":
	        assign(node);
	        break;
	      case "ObjectPath":
	        setPath(node);
	        break;
	      case "ArrayPath":
	        addTableArray(node);
	        break;
	      }
	    }
	
	    return data;
	  }
	
	  function genError(err, line, col) {
	    var ex = new Error(err);
	    ex.line = line;
	    ex.column = col;
	    throw ex;
	  }
	
	  function assign(node) {
	    var key = node.key;
	    var value = node.value;
	    var line = node.line;
	    var column = node.column;
	
	    var fullPath;
	    if (currentPath) {
	      fullPath = currentPath + "." + key;
	    } else {
	      fullPath = key;
	    }
	    if (typeof context[key] !== "undefined") {
	      genError("Cannot redefine existing key '" + fullPath + "'.", line, column);
	    }
	
	    context[key] = reduceValueNode(value);
	
	    if (!pathAssigned(fullPath)) {
	      assignedPaths.push(fullPath);
	      valueAssignments.push(fullPath);
	    }
	  }
	
	
	  function pathAssigned(path) {
	    return assignedPaths.indexOf(path) !== -1;
	  }
	
	  function reduceValueNode(node) {
	    if (node.type === "Array") {
	      return reduceArrayWithTypeChecking(node.value);
	    } else if (node.type === "InlineTable") {
	      return reduceInlineTableNode(node.value);
	    } else {
	      return node.value;
	    }
	  }
	
	  function reduceInlineTableNode(values) {
	    var obj = {};
	    for (var i = 0; i < values.length; i++) {
	      var val = values[i];
	      if (val.value.type === "InlineTable") {
	        obj[val.key] = reduceInlineTableNode(val.value.value);
	      } else if (val.type === "InlineTableValue") {
	        obj[val.key] = reduceValueNode(val.value);
	      }
	    }
	
	    return obj;
	  }
	
	  function setPath(node) {
	    var path = node.value;
	    var quotedPath = path.map(quoteDottedString).join(".");
	    var line = node.line;
	    var column = node.column;
	
	    if (pathAssigned(quotedPath)) {
	      genError("Cannot redefine existing key '" + path + "'.", line, column);
	    }
	    assignedPaths.push(quotedPath);
	    context = deepRef(data, path, {}, line, column);
	    currentPath = path;
	  }
	
	  function addTableArray(node) {
	    var path = node.value;
	    var quotedPath = path.map(quoteDottedString).join(".");
	    var line = node.line;
	    var column = node.column;
	
	    if (!pathAssigned(quotedPath)) {
	      assignedPaths.push(quotedPath);
	    }
	    assignedPaths = assignedPaths.filter(function(p) {
	      return p.indexOf(quotedPath) !== 0;
	    });
	    assignedPaths.push(quotedPath);
	    context = deepRef(data, path, [], line, column);
	    currentPath = quotedPath;
	
	    if (context instanceof Array) {
	      var newObj = {};
	      context.push(newObj);
	      context = newObj;
	    } else {
	      genError("Cannot redefine existing key '" + path + "'.", line, column);
	    }
	  }
	
	  // Given a path 'a.b.c', create (as necessary) `start.a`,
	  // `start.a.b`, and `start.a.b.c`, assigning `value` to `start.a.b.c`.
	  // If `a` or `b` are arrays and have items in them, the last item in the
	  // array is used as the context for the next sub-path.
	  function deepRef(start, keys, value, line, column) {
	    var traversed = [];
	    var traversedPath = "";
	    var path = keys.join(".");
	    var ctx = start;
	
	    for (var i = 0; i < keys.length; i++) {
	      var key = keys[i];
	      traversed.push(key);
	      traversedPath = traversed.join(".");
	      if (typeof ctx[key] === "undefined") {
	        if (i === keys.length - 1) {
	          ctx[key] = value;
	        } else {
	          ctx[key] = {};
	        }
	      } else if (i !== keys.length - 1 && valueAssignments.indexOf(traversedPath) > -1) {
	        // already a non-object value at key, can't be used as part of a new path
	        genError("Cannot redefine existing key '" + traversedPath + "'.", line, column);
	      }
	
	      ctx = ctx[key];
	      if (ctx instanceof Array && ctx.length && i < keys.length - 1) {
	        ctx = ctx[ctx.length - 1];
	      }
	    }
	
	    return ctx;
	  }
	
	  function reduceArrayWithTypeChecking(array) {
	    // Ensure that all items in the array are of the same type
	    var firstType = null;
	    for (var i = 0; i < array.length; i++) {
	      var node = array[i];
	      if (firstType === null) {
	        firstType = node.type;
	      } else {
	        if (node.type !== firstType) {
	          genError("Cannot add value of type " + node.type + " to array of type " +
	            firstType + ".", node.line, node.column);
	        }
	      }
	    }
	
	    // Recursively reduce array of nodes into array of the nodes' values
	    return array.map(reduceValueNode);
	  }
	
	  function quoteDottedString(str) {
	    if (str.indexOf(".") > -1) {
	      return "\"" + str + "\"";
	    } else {
	      return str;
	    }
	  }
	}
	
	module.exports = {
	  compile: compile
	};


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

	const $ = __webpack_require__(1);
	const Circle = __webpack_require__(12);
	const globalEvent = window.globalEvent; // TODO: 移行終わったら削除
	const Annotation = __webpack_require__(13);
	
	class Highlight extends Annotation {
	  constructor(id, startOffset, endOffset, elements, referenceId){
	    super(id, referenceId);
	    this.startOffset = startOffset;
	    this.endOffset = endOffset;
	
	    this.elements = elements;
	    this.topElement = elements[0];
	
	    this.addCircle();
	    this.setClass();
	    this.jObject = $(`.${this.getClassName()}`);
	
	    this.jObject.hover(
	        this.handleHoverIn.bind(this),
	        this.handleHoverOut.bind(this)
	    );
	  }
	
	  handleHoverIn(e){
	    this.elements.forEach((e)=>{
	      $(e).addClass("htmlanno-border");
	    });
	    this.dispatchWindowEvent('annotationHoverIn', this);
	  }
	
	  handleHoverOut(e){
	    this.elements.forEach((e)=>{
	      $(e).removeClass("htmlanno-border");
	    });
	    this.dispatchWindowEvent('annotationHoverOut', this);
	  }
	
	  addCircle(){
	    this.topElement.setAttribute("style", "position:relative;");
	    this.circle = new Circle(this.id, this);
	    this.circle.appendTo(this.topElement);
	  }
	
	  getClassName(){
	    return `htmlanno-hl-${Highlight.createId(this.id, this.referenceId)}`;
	  }
	
	  getBoundingClientRect(){
	    const rect = {top:999999, bottom:0, left:999999, right:0};
	    this.elements.forEach((e)=>{
	      const r = e.getBoundingClientRect();
	      rect.top = Math.min(rect.top, r.top);
	      rect.bottom = Math.max(rect.bottom, r.bottom);
	      rect.left = Math.min(rect.left, r.left);
	      rect.right = Math.max(rect.right, r.right);
	    });
	    return rect;
	  }
	
	  setClass(){
	    this.addClass(this.getClassName());
	    this.addClass("htmlanno-highlight");
	  }
	
	  addClass(name){
	    this.elements.forEach((e)=>{
	      $(e).addClass(name);
	    });
	  }
	
	  removeClass(name){
	    this.elements.forEach((e)=>{
	      $(e).removeClass(name);
	    });
	  }
	
	  select(){
	    if (this.selected) {
	      this.blur();
	    } else {
	      this.addClass("htmlanno-highlight-selected");
	      this.selected = true;
	      this.dispatchWindowEvent('annotationSelected', this);
	    }
	  }
	
	  blur(){
	    this.removeClass("htmlanno-highlight-selected");
	    super.blur();
	  }
	
	  remove(){
	    this.blur();
	    this.circle.remove();
	    // ここのみjOjectを使用するとうまく動作しない(自己破壊になるため?)
	    $(`.${this.getClassName()}`).each((i, elm) => {
	      $(elm).replaceWith(elm.childNodes);
	    });
	    this.jObject = null;
	    this.dispatchWindowEvent('annotationDeleted', this);
	  }
	
	  saveToml(){
	    return [
	      'type = "span"',
	      `position = [${this.startOffset}, ${this.endOffset}]`,
	      'text = "' + $(this.elements).text() + '"',
	      `label = "${this.content()}"`
	    ].join("\n");
	  }
	
	  equals(obj){
	    if (undefined == obj || this !== obj) {
	      return false;
	    }
	    else {
	      // TODO: 同一ID、同一選択範囲等でチェックするか？
	      return true;
	    }
	  }
	
	  static isMydata(toml){
	    return (undefined != toml && "span" == toml.type);
	  }
	
	  setContent(text){
	    this.jObject[0].setAttribute('data-label', text);
	  }
	
	  content(){
	    return this.jObject[0].getAttribute('data-label');
	  }
	
	  get type() {
	    return 'span';
	  }
	
	  get scrollTop() {
	    return this.circle.positionCenter().top;
	  }
	
	  blink() {
	    this.circle.jObject.addClass('htmlanno-circle-hover');
	    setTimeout(() => {
	      this.circle.jObject.removeClass('htmlanno-circle-hover');
	    }, 1000);
	  }
	
	  setColor(color) {
	    this.jObject[0].style.backgroundColor = tinycolor(color).setAlpha(0.2).toRgbString();
	  }
	
	  removeColor() {
	    this.jObject[0].style.backgroundColor = undefined;
	  } 
	}
	
	module.exports = Highlight;


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

	const $ = __webpack_require__(1);
	const globalEvent = window.globalEvent;
	
	class Circle{
	  constructor(id, highlight){
	    if (!Circle.instances){
	      Circle.instances = [];
	    }
	
	    Circle.instances.push(this);
	    this.id = id;
	    this.highlight = highlight;
	    this.size = 10;
	
	    this.jObject = $(`<div id="${this.domId()}" draggable="true" class="htmlanno-circle"></div>`);
	
	    this.jObject.on("click", (e)=>{
	      this.highlight.select();
	    });
	
	    this.jObject.hover(
	      this.handleHoverIn.bind(this),
	      this.handleHoverOut.bind(this)
	    );
	  }
	
	  handleHoverIn(e){
	    e.stopPropagation();
	    this.highlight.dispatchWindowEvent('annotationHoverIn', this.highlight);
	  }
	
	  handleHoverOut(e){
	    e.stopPropagation();
	    this.highlight.dispatchWindowEvent('annotationHoverOut', this.highlight);
	  }
	
	  domId(){
	    return "circle-"+this.id;
	  }
	
	  emptyImg(){
	    const img = document.createElement('img');
	    // empty image
	    img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
	
	    return img;
	  }
	
	  originalPosition(){
	    return this.basePosition;
	  }
	
	  samePositionCircles(){
	    let n = 0;
	    for (let i = 0; i < Circle.instances.length; i++){
	      const cir = Circle.instances[i];
	      if (cir === this){
	        break;
	      }
	      const l1 = cir.originalPosition().left;
	      const t1 = cir.originalPosition().top;
	      const l2 = this.originalPosition().left;
	      const t2 = this.originalPosition().top;
	      if (Math.abs(Math.floor(l1-l2)) <= 3 && Math.abs(Math.floor(t1-t2)) <= 3) {
	        n += 1;
	      }
	    }
	
	    return n;
	  }
	
	  divPosition(){
	    return {left: -this.size/2, top: -this.size -5 -(this.samePositionCircles() * 12)}
	  }
	
	  positionCenter(){
	    const pos = this.divPosition();
	    const p = this.originalPosition();
	    pos.left += p.left;
	    pos.top += p.top;
	    pos.left += 15;
	    pos.top += 5;
	
	    return pos;
	  }
	
	  appendTo(target){
	    this.jObject.appendTo(target);
	    this.jObject.css("left", `0px`);
	    this.jObject.css("top", `0px`);
	    // this.jObject.css("transition", "0.0s");
	    this.basePosition = this.jObject.offset();
	    this.basePosition.top -= $("#viewer").offset().top;
	    this.basePosition.left -= $("#viewer").offset().left;
	    const pos = this.divPosition();
	    this.jObject.css("left", `${pos.left}px`);
	    this.jObject.css("top", `${pos.top}px`);
	  }
	
	  isHit(x, y){
	    const c = this.positionCenter();
	    return c.left <= x+this.size && c.left >= x-this.size && c.top <= y+this.size && c.top >= y-this.size;
	  }
	
	  resetPosition(){
	    this.jObject.css("transition", "0.0s");
	    this.jObject.css("left", `0px`);
	    this.jObject.css("top", `0px`);
	    this.basePosition = this.jObject.offset();
	    this.basePosition.top -= $("#viewer").offset().top;
	    this.basePosition.left -= $("#viewer").offset().left;
	  }
	
	  reposition(){
	    const pos = this.divPosition();
	    this.jObject.css("left", `${pos.left}px`);
	    this.jObject.css("top", `${pos.top}px`);
	    this.jObject.css("transition", "0.2s");
	  }
	
	  remove(){
	    globalEvent.emit("removecircle", this);
	    this.jObject.remove();
	    globalEvent.removeObject(this);
	    const idx = Circle.instances.findIndex((e)=>e===this);
	    if (idx !== -1){
	      Circle.instances.splice(idx, 1);
	      Circle.instances.forEach((cir)=>{
	        cir.resetPosition();
	      });
	      Circle.instances.forEach((cir)=>{
	        cir.reposition();
	      });
	    }
	  }
	}
	
	module.exports = Circle;


/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

	const AnnoUI = __webpack_require__(6);
	
	class Annotation {
	  constructor(id, referenceId) {
	    this.id = id;
	    this.referenceId = referenceId;
	    this._selected = false;
	    this._selectedTimestamp = undefined;
	    this._uuid = AnnoUI.util.uuid();
	  }
	
	  getId() {
	    return Annotation.createId(this.id, this.referenceId);
	  }
	
	  getReferenceId() {
	    return this.referenceId;
	  }
	
	  /**
	   * Returns annotation object Identifier (Unique in all(highlight and relation) object).
	   *
	   * For Anno-ui annoListDropDown. This interface calls `annotation.uuid` as the identifier.
	   */
	  get uuid() {
	    return this._uuid;
	  }
	
	  /**
	   * Returns annotation type.
	   * this method expects ths subclass to override.
	   * type ::= 'span'|'relation'|'area' (but 'area' is not used in htmlanno.)
	   *
	   * For Anno-ui annoListDropDown.
	   *
	  get type() {
	    return undefined;
	  }
	
	  /**
	   * Returns annotation direction.
	   * direction ::= 'one-way'|'two-way'|'link'
	   * this method expects ths subclass to override.
	   *
	   * For Anno-ui annoListDropDown.
	   */
	  get direction() {
	    return undefined;
	  }
	
	  /**
	   * Returns annotation label.
	   *
	   * For Anno-ui annoListDropDown.
	   */
	  get text() {
	    return this.content();
	  }
	
	  /**
	   * Returns the Y coordinate of the annotation object.
	   * this method expects ths subclass to override.
	   */
	  get scrollTop() {
	    return 0;
	  }
	
	  get selected() {
	    return this._selected;
	  }
	
	  set selected(value) {
	    this._selected = value;
	    this._selectedTimestamp = value ? new Date() : undefined;
	  }
	
	  get selectedTimestamp() {
	    return this._selectedTimestamp;
	  }
	
	  blur() {
	    this.selected = false;
	    this.dispatchWindowEvent('annotationDeselected');
	  }
	
	  blink() {
	    return;
	  }
	
	  setColor(color) {
	  }
	
	  removeColor() {
	  }
	
	  // TODO: Anno-UI events 辺りで提供してほしい
	  dispatchWindowEvent(eventName, data) {
	    let event = document.createEvent('CustomEvent')
	    event.initCustomEvent(eventName, true, true, data)
	    window.dispatchEvent(event)
	  }
	
	  static createId(id, referenceId) {
	    if (undefined == referenceId) {
	      referenceId = '';
	    } else {
	      referenceId = `-${referenceId.replace(/[().#]/g, '_')}`;
	    }
	    return `${id}${referenceId}`;
	  }
	}
	
	module.exports = Annotation;


/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

	const $ = __webpack_require__(1);
	const RenderRelation = __webpack_require__(15);
	const globalEvent = window.globalEvent;
	const Annotation = __webpack_require__(13);
	
	class RelationAnnotation extends Annotation {
	  constructor(id, startingCircle, endingCircle, direction, referenceId){
	    super(id, referenceId);
	    this.startingCircle = startingCircle;
	    this.endingCircle = endingCircle;
	
	    this._direction = direction;
	
	    this.arrow = new RenderRelation(
	      Annotation.createId(id, referenceId),
	      startingCircle.positionCenter(),
	      this._direction
	    );
	    this.arrow.appendTo($("#htmlanno-svg-screen"));
	    this.arrow.on("click", (e)=>{
	      this.select();
	    });
	    this.arrow.on("mouseenter", this.handleHoverIn.bind(this));
	    this.arrow.on("mouseleave", this.handleHoverOut.bind(this));
	
	    globalEvent.on(this, "removecircle", (cir)=>{
	      if (this.startingCircle === cir || this.endingCircle === cir){
	        this.remove();
	        globalEvent.emit("removearrowannotation", this);
	      }
	    });
	    this.arrow.point(this.endingCircle.positionCenter());
	    globalEvent.on(this, "resizewindow", this.reposition.bind(this));
	    globalEvent.emit("arrowannotationconnect", this);
	  }
	
	  positionCenter(){
	    const p1 = this.startingCircle.positionCenter();
	    const p2 = this.endingCircle.positionCenter();
	    return {left: (p1.left+p2.left)/2, top: (p1.top+p2.top)/2};
	  }
	
	  reposition(){
	    if (this.arrow){
	      this.arrow.move(this.startingCircle.positionCenter());
	      if(this.endingCircle){
	        this.arrow.point(this.endingCircle.positionCenter());
	      }
	    }
	  }
	
	  select(){
	    if (this.selected) {
	      this.blur();
	    } else {
	      this.arrow.select();
	      this.selected = true;
	      this.dispatchWindowEvent('annotationSelected', this);
	    }
	  }
	
	  blur(){
	    this.arrow.blur();
	    super.blur();
	  }
	
	  remove(){
	    this.blur();
	    this.arrow.remove();
	    globalEvent.removeObject(this);
	    this.dispatchWindowEvent('annotationDeleted', this);
	  }
	
	  handleHoverIn(e){
	    this.arrow.handleHoverIn();
	    this.dispatchWindowEvent('annotationHoverIn', this);
	  }
	
	  handleHoverOut(e){
	    this.arrow.handleHoverOut();
	    this.dispatchWindowEvent('annotationHoverOut', this);
	  }
	
	  saveToml(){
	    return [
	      'type = "relation"',
	      `dir = "${this._direction}"`,
	      `ids = ["${this.startingCircle.highlight.id}", "${this.endingCircle.highlight.id}"]`,
	      `label = "${this.content()}"`
	    ].join("\n");
	  }
	
	  equals(obj){
	    if (undefined == obj || this !== obj) {
	      return false;
	    }
	    else {
	      // TODO: 同一ID、同一のstarting/entering等でチェックするか？
	      return true;
	    }
	  }
	
	  static isMydata(toml){
	    return (
	      undefined !== toml && "relation" === toml.type && 
	      ("one-way" === toml.dir || "two-way" === toml.dir || "link" === toml.dir)
	    );
	  }
	
	  setContent(text){
	    this.arrow.setContent(text);
	  }
	
	  content(){
	    return this.arrow.content();
	  }
	
	  getClassName() {
	    return this.arrow.domId();
	  }
	
	  setColor(color) {
	    this.arrow.setColor(color);
	  }
	
	  removeColor() {
	    this.arrow.removeColor();
	  }
	
	  get type() {
	    return 'relation';
	  }
	
	  get direction() {
	    return this._direction;
	  }
	
	  get scrollTop() {
	    return this.startingCircle.positionCenter().top;
	  }
	}
	
	module.exports = RelationAnnotation;
	


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

	const $ = __webpack_require__(1);
	const globalEvent = window.globalEvent;
	
	class RenderRelation{
	  constructor(id, position, direction){
	    this.id = id;
	    this.move(position);
	    this.eventHandlers = [];
	
	    switch(direction){
	      case 'one-way':
	        this.jObject = this._createOnewayArrowHead();
	        break;
	      case 'two-way':
	        this.jObject = this._createTwowayArrowHead();
	        break;
	      case 'link':
	        this.jObject = this._createLinkHead();
	        break;
	      default:
	        console.log('ERROR! Undefined type: ' + type);
	    }
	
	    this.jObjectOutline = $(`
	        <path
	        id="${this.domId()}-outline"
	        class="htmlanno-arrow-outline"
	        d="M 0,0 C 0,0 0,0 0,0" />
	        `);
	
	    globalEvent.on(this, "svgupdate", this.retouch.bind(this));
	  }
	
	  _createLinkHead(){
	    return $(`
	        <path
	        id="${this.domId()}"
	        class="htmlanno-arrow"
	        d="M 0,0 C 0,0 0,0 0,0" />
	    `);
	  }
	
	  _createOnewayArrowHead(){
	    return this._createLinkHead().attr(
	      'marker-end', 'url(#htmlanno-arrow-head)'
	    );
	  }
	
	  _createTwowayArrowHead(){
	    return this._createOnewayArrowHead().attr(
	      'marker-start', 'url(#htmlanno-arrow-head)'
	    );
	  }
	
	  curvePath(fromX, fromY, toX, toY){
	    const arcHeight = 30;
	
	    const y = Math.min(fromY, toY) - arcHeight;
	    const dx = (fromX - toX) / 4;
	
	    // TODO
	    this.halfY = this.y(0.55, fromY, y, y, toY);
	
	    return `M ${fromX},${fromY} C ${fromX-dx},${y} ${toX+dx},${y} ${toX},${toY}`;
	  }
	
	  on(name, handler){
	    this.eventHandlers.push({name: name, handler: handler});
	    this.jObject.on(name, handler);
	  }
	
	  off(name){
	    this.eventHandlers = this.eventHandlers.filter((eh)=>{
	      return (name != eh.name);
	    });
	    this.jObject.off(name);
	  }
	
	  domId(){
	    return "arrow-" + this.id;
	  }
	
	  retouch(){
	    this.jObject = $(`#${this.domId()}`);
	    this.jObjectOutline = $(`#${this.domId()}-outline`);
	    this.element = this.jObject.get(0);
	    this.eventHandlers.forEach((eh)=>{
	      this.jObject.on(eh.name, eh.handler);
	    });
	  }
	
	  appendTo(target){
	    this.jObjectOutline.appendTo(target);
	    this.jObjectOutline.hide();
	    this.jObject.appendTo(target);
	    $("#htmlanno-svg-screen").html($("#htmlanno-svg-screen").html());
	    globalEvent.emit("svgupdate", this);
	  }
	
	  move(position){
	    this.fromX = position.left;
	    this.fromY = position.top;
	  }
	
	  point(position){
	    const path = this.curvePath(this.fromX, this.fromY, position.left, position.top);
	    this.jObject.attr("d", path);
	    this.jObjectOutline.attr("d", path);
	  }
	
	  y(t, y1, y2, y3, y4){
	    const tp = 1 - t;
	    return t*t*t*y4 + 3*t*t*tp*y3 + 3*t*tp*tp*y2 + tp*tp*tp*y1;
	  }
	
	  select(){
	    this.jObjectOutline.show();
	  }
	
	  blur(){
	    this.jObjectOutline.hide();
	  }
	
	  remove(){
	    this.jObject.remove();
	    this.jObjectOutline.remove();
	    globalEvent.removeObject(this);
	  }
	
	  handleHoverIn(e){
	    this.jObject.addClass("htmlanno-arrow-hover");
	  }
	
	  handleHoverOut(e){
	    this.jObject.removeClass("htmlanno-arrow-hover");
	  }
	
	  setContent(value){
	    this.jObject[0].setAttribute('data-label', value);
	  }
	
	  content(){
	    return this.jObject[0].getAttribute('data-label');
	  }
	
	  setExtension(value){
	    this.jObject[0].setAttribute('data-ext', value);
	  }
	
	  extension(){
	    return this.jObject[0].getAttribute('data-ext');
	  }
	
	  setColor(color) {
	    this.jObject[0].style.stroke = color;
	    this.jObject[0].setAttribute('opacity', '0.2');
	  }
	
	  removeColor() {
	    this.jObject[0].style.stroke = undefined;
	    this.jObject[0].removeAttribute('opacity');
	  }
	}
	
	module.exports = RenderRelation;


/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

	const $ = __webpack_require__(1);
	const rangy = __webpack_require__(17);
	__webpack_require__(18);
	__webpack_require__(19);
	__webpack_require__(20);
	
	const Highlight = __webpack_require__(11);
	const Annotation = __webpack_require__(13);
	const WindowEvent = __webpack_require__(21);
	
	class Highlighter{
	  constructor(annotationContainer){
	    this.highlights = annotationContainer;
	  }
	
	  // 定数扱い
	  get BASE_NODE(){
	    return document.getElementById("viewer");
	  }
	
	  nodeFromTextOffset(offset){
	    return this.nodeFromTextOffset_(this.BASE_NODE, offset);
	  }
	
	  nodeFromTextOffset_(node, offset){
	    for (let i = 0; i < node.childNodes.length ; i++){
	      const child = node.childNodes[i];
	
	      if (child.nodeName == "#text"){
	        if (offset <= child.textContent.length){
	          return {offset:offset, node:child};
	        }
	        offset -= child.textContent.length;
	      } else{
	        const ret = this.nodeFromTextOffset_(child, offset);
	        if (ret.node){
	          return ret;
	        }
	        offset = ret.offset;
	      }
	    }
	
	    return {offset:offset, node:null};
	  }
	
	  textOffsetFromNode(node){
	    return this.textOffsetFromNode_(node, 0);
	  }
	
	  textOffsetFromNode_(node, offset){
	    if (node.id == this.BASE_NODE.id){
	      return offset;
	    }
	
	    if (node.previousSibling){
	      offset += node.previousSibling.textContent.length;
	      return this.textOffsetFromNode_(node.previousSibling, offset);
	    }else{
	      return this.textOffsetFromNode_(node.parentNode, offset);
	    }
	  }
	
	  selectRange(startBodyOffset, endBodyOffset){
	    if (startBodyOffset > endBodyOffset){
	      const tmp = startBodyOffset;
	      startBodyOffset = endBodyOffset;
	      endBodyOffset = tmp;
	    }
	
	    const start = this.nodeFromTextOffset(startBodyOffset);
	    const end = this.nodeFromTextOffset(endBodyOffset);
	    const selection = rangy.getSelection();
	    const range = rangy.createRange();
	    range.setStart(start.node, start.offset);
	    range.setEnd(end.node, end.offset);
	    selection.setSingleRange(range);
	  }
	
	  highlight(label){
	    const selection = rangy.getSelection();
	    if (0 == selection.rangeCount){
	      WindowEvent.emit(
	        'open-alert-dialog', {message: 'Text span is not selected.'}
	      );
	      return;
	    }
	    if (selection.isCollapsed){
	      return;
	    }
	
	    const id = this.highlights.nextId();
	    const startOffset = this.textOffsetFromNode(selection.anchorNode)+selection.anchorOffset;
	    const endOffset = this.textOffsetFromNode(selection.focusNode)+selection.focusOffset;
	    return this.create(id, startOffset, endOffset, label);
	  }
	
	  create(id, startOffset, endOffset, text, referenceId){
	    this.selectRange(startOffset, endOffset);
	    const selection = rangy.getSelection();
	    if (selection.isCollapsed){
	      return;
	    }
	
	    const temporaryElements = [];
	    let highlighter = rangy.createHighlighter();
	    highlighter.addClassApplier(rangy.createClassApplier(
	      `htmlanno-highlight${Annotation.createId(id, referenceId)}`,
	      {
	        ignoreWhiteSpace: true,
	        onElementCreate: (element)=>{temporaryElements.push(element)},
	        useExistingElements: false
	      }
	    ));
	
	    let highlight = null;
	    highlighter.highlightSelection(
	      `htmlanno-highlight${Annotation.createId(id, referenceId)}`,
	      {exclusive: false}
	    );
	    if (temporaryElements.length > 0){
	      highlight = new Highlight(
	        id, startOffset, endOffset, temporaryElements, referenceId
	      );
	      highlight.setContent(text);
	
	      // TODO: 同一のSpan(定義は別途検討)を許さないのであればここでエラー判定必要
	      this.highlights.add(highlight);
	    }
	    selection.removeAllRanges();
	
	    return highlight;
	  }
	
	  addToml(id, toml, referenceId){
	    try {
	      this.selectRange(toml.position[0], toml.position[1]);
	      const selection = rangy.getSelection();
	      if (!selection.isCollapsed){
	        const startOffset = this.textOffsetFromNode(selection.anchorNode)+selection.anchorOffset;
	        const endOffset   = this.textOffsetFromNode(selection.focusNode)+selection.focusOffset;
	        let span = this.create(
	          parseInt(id), startOffset, endOffset, toml.label, referenceId
	        );
	        if (null != span) {
	          span.blur();
	        }
	        return span;
	      }
	    } catch(ex) {
	      console.log(`id: ${id}, referenceId: ${referenceId}, toml is the following;`);
	      console.log(toml);
	      console.log(ex);
	      return null;
	    }
	  }
	
	  get(id, referenceId){
	    return this.highlights.findById(Annotation.createId(id, referenceId));
	  }
	
	  remove(referenceId){
	    if (undefined == referenceId) {
	      return new Promise((resolve) => {
	        this.highlights.forEach((annotation, i)=>{
	          this.highlights.remove(i);
	        });
	        resolve(undefined);
	      });
	    } else {
	      let promises = [];
	      this.highlights.forEach((annotation, i)=>{
	        if (annotation instanceof Highlight){
	          if (undefined != referenceId) {
	            if (referenceId == annotation.getReferenceId()) {
	              promises.push(this._remove(annotation, i));
	            }
	          } else {
	            promises.push(this._remove(annotation, i));
	          }
	        }
	      });
	      return Promise.all(promises);
	    }
	  }
	
	  _remove(annotation, index) {
	    return new Promise((resolve, reject) => { 
	      this.highlights.remove(index);
	    }).catch((reject) => {
	      console.log(reject);
	    });
	  }
	}
	
	module.exports = Highlighter;


/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Rangy, a cross-browser JavaScript range and selection library
	 * https://github.com/timdown/rangy
	 *
	 * Copyright 2015, Tim Down
	 * Licensed under the MIT license.
	 * Version: 1.3.0
	 * Build date: 10 May 2015
	 */
	
	(function(factory, root) {
	    if (true) {
	        // AMD. Register as an anonymous module.
	        !(__WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.call(exports, __webpack_require__, exports, module)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    } else if (typeof module != "undefined" && typeof exports == "object") {
	        // Node/CommonJS style
	        module.exports = factory();
	    } else {
	        // No AMD or CommonJS support so we place Rangy in (probably) the global variable
	        root.rangy = factory();
	    }
	})(function() {
	
	    var OBJECT = "object", FUNCTION = "function", UNDEFINED = "undefined";
	
	    // Minimal set of properties required for DOM Level 2 Range compliance. Comparison constants such as START_TO_START
	    // are omitted because ranges in KHTML do not have them but otherwise work perfectly well. See issue 113.
	    var domRangeProperties = ["startContainer", "startOffset", "endContainer", "endOffset", "collapsed",
	        "commonAncestorContainer"];
	
	    // Minimal set of methods required for DOM Level 2 Range compliance
	    var domRangeMethods = ["setStart", "setStartBefore", "setStartAfter", "setEnd", "setEndBefore",
	        "setEndAfter", "collapse", "selectNode", "selectNodeContents", "compareBoundaryPoints", "deleteContents",
	        "extractContents", "cloneContents", "insertNode", "surroundContents", "cloneRange", "toString", "detach"];
	
	    var textRangeProperties = ["boundingHeight", "boundingLeft", "boundingTop", "boundingWidth", "htmlText", "text"];
	
	    // Subset of TextRange's full set of methods that we're interested in
	    var textRangeMethods = ["collapse", "compareEndPoints", "duplicate", "moveToElementText", "parentElement", "select",
	        "setEndPoint", "getBoundingClientRect"];
	
	    /*----------------------------------------------------------------------------------------------------------------*/
	
	    // Trio of functions taken from Peter Michaux's article:
	    // http://peter.michaux.ca/articles/feature-detection-state-of-the-art-browser-scripting
	    function isHostMethod(o, p) {
	        var t = typeof o[p];
	        return t == FUNCTION || (!!(t == OBJECT && o[p])) || t == "unknown";
	    }
	
	    function isHostObject(o, p) {
	        return !!(typeof o[p] == OBJECT && o[p]);
	    }
	
	    function isHostProperty(o, p) {
	        return typeof o[p] != UNDEFINED;
	    }
	
	    // Creates a convenience function to save verbose repeated calls to tests functions
	    function createMultiplePropertyTest(testFunc) {
	        return function(o, props) {
	            var i = props.length;
	            while (i--) {
	                if (!testFunc(o, props[i])) {
	                    return false;
	                }
	            }
	            return true;
	        };
	    }
	
	    // Next trio of functions are a convenience to save verbose repeated calls to previous two functions
	    var areHostMethods = createMultiplePropertyTest(isHostMethod);
	    var areHostObjects = createMultiplePropertyTest(isHostObject);
	    var areHostProperties = createMultiplePropertyTest(isHostProperty);
	
	    function isTextRange(range) {
	        return range && areHostMethods(range, textRangeMethods) && areHostProperties(range, textRangeProperties);
	    }
	
	    function getBody(doc) {
	        return isHostObject(doc, "body") ? doc.body : doc.getElementsByTagName("body")[0];
	    }
	
	    var forEach = [].forEach ?
	        function(arr, func) {
	            arr.forEach(func);
	        } :
	        function(arr, func) {
	            for (var i = 0, len = arr.length; i < len; ++i) {
	                func(arr[i], i);
	            }
	        };
	
	    var modules = {};
	
	    var isBrowser = (typeof window != UNDEFINED && typeof document != UNDEFINED);
	
	    var util = {
	        isHostMethod: isHostMethod,
	        isHostObject: isHostObject,
	        isHostProperty: isHostProperty,
	        areHostMethods: areHostMethods,
	        areHostObjects: areHostObjects,
	        areHostProperties: areHostProperties,
	        isTextRange: isTextRange,
	        getBody: getBody,
	        forEach: forEach
	    };
	
	    var api = {
	        version: "1.3.0",
	        initialized: false,
	        isBrowser: isBrowser,
	        supported: true,
	        util: util,
	        features: {},
	        modules: modules,
	        config: {
	            alertOnFail: false,
	            alertOnWarn: false,
	            preferTextRange: false,
	            autoInitialize: (typeof rangyAutoInitialize == UNDEFINED) ? true : rangyAutoInitialize
	        }
	    };
	
	    function consoleLog(msg) {
	        if (typeof console != UNDEFINED && isHostMethod(console, "log")) {
	            console.log(msg);
	        }
	    }
	
	    function alertOrLog(msg, shouldAlert) {
	        if (isBrowser && shouldAlert) {
	            alert(msg);
	        } else  {
	            consoleLog(msg);
	        }
	    }
	
	    function fail(reason) {
	        api.initialized = true;
	        api.supported = false;
	        alertOrLog("Rangy is not supported in this environment. Reason: " + reason, api.config.alertOnFail);
	    }
	
	    api.fail = fail;
	
	    function warn(msg) {
	        alertOrLog("Rangy warning: " + msg, api.config.alertOnWarn);
	    }
	
	    api.warn = warn;
	
	    // Add utility extend() method
	    var extend;
	    if ({}.hasOwnProperty) {
	        util.extend = extend = function(obj, props, deep) {
	            var o, p;
	            for (var i in props) {
	                if (props.hasOwnProperty(i)) {
	                    o = obj[i];
	                    p = props[i];
	                    if (deep && o !== null && typeof o == "object" && p !== null && typeof p == "object") {
	                        extend(o, p, true);
	                    }
	                    obj[i] = p;
	                }
	            }
	            // Special case for toString, which does not show up in for...in loops in IE <= 8
	            if (props.hasOwnProperty("toString")) {
	                obj.toString = props.toString;
	            }
	            return obj;
	        };
	
	        util.createOptions = function(optionsParam, defaults) {
	            var options = {};
	            extend(options, defaults);
	            if (optionsParam) {
	                extend(options, optionsParam);
	            }
	            return options;
	        };
	    } else {
	        fail("hasOwnProperty not supported");
	    }
	
	    // Test whether we're in a browser and bail out if not
	    if (!isBrowser) {
	        fail("Rangy can only run in a browser");
	    }
	
	    // Test whether Array.prototype.slice can be relied on for NodeLists and use an alternative toArray() if not
	    (function() {
	        var toArray;
	
	        if (isBrowser) {
	            var el = document.createElement("div");
	            el.appendChild(document.createElement("span"));
	            var slice = [].slice;
	            try {
	                if (slice.call(el.childNodes, 0)[0].nodeType == 1) {
	                    toArray = function(arrayLike) {
	                        return slice.call(arrayLike, 0);
	                    };
	                }
	            } catch (e) {}
	        }
	
	        if (!toArray) {
	            toArray = function(arrayLike) {
	                var arr = [];
	                for (var i = 0, len = arrayLike.length; i < len; ++i) {
	                    arr[i] = arrayLike[i];
	                }
	                return arr;
	            };
	        }
	
	        util.toArray = toArray;
	    })();
	
	    // Very simple event handler wrapper function that doesn't attempt to solve issues such as "this" handling or
	    // normalization of event properties
	    var addListener;
	    if (isBrowser) {
	        if (isHostMethod(document, "addEventListener")) {
	            addListener = function(obj, eventType, listener) {
	                obj.addEventListener(eventType, listener, false);
	            };
	        } else if (isHostMethod(document, "attachEvent")) {
	            addListener = function(obj, eventType, listener) {
	                obj.attachEvent("on" + eventType, listener);
	            };
	        } else {
	            fail("Document does not have required addEventListener or attachEvent method");
	        }
	
	        util.addListener = addListener;
	    }
	
	    var initListeners = [];
	
	    function getErrorDesc(ex) {
	        return ex.message || ex.description || String(ex);
	    }
	
	    // Initialization
	    function init() {
	        if (!isBrowser || api.initialized) {
	            return;
	        }
	        var testRange;
	        var implementsDomRange = false, implementsTextRange = false;
	
	        // First, perform basic feature tests
	
	        if (isHostMethod(document, "createRange")) {
	            testRange = document.createRange();
	            if (areHostMethods(testRange, domRangeMethods) && areHostProperties(testRange, domRangeProperties)) {
	                implementsDomRange = true;
	            }
	        }
	
	        var body = getBody(document);
	        if (!body || body.nodeName.toLowerCase() != "body") {
	            fail("No body element found");
	            return;
	        }
	
	        if (body && isHostMethod(body, "createTextRange")) {
	            testRange = body.createTextRange();
	            if (isTextRange(testRange)) {
	                implementsTextRange = true;
	            }
	        }
	
	        if (!implementsDomRange && !implementsTextRange) {
	            fail("Neither Range nor TextRange are available");
	            return;
	        }
	
	        api.initialized = true;
	        api.features = {
	            implementsDomRange: implementsDomRange,
	            implementsTextRange: implementsTextRange
	        };
	
	        // Initialize modules
	        var module, errorMessage;
	        for (var moduleName in modules) {
	            if ( (module = modules[moduleName]) instanceof Module ) {
	                module.init(module, api);
	            }
	        }
	
	        // Call init listeners
	        for (var i = 0, len = initListeners.length; i < len; ++i) {
	            try {
	                initListeners[i](api);
	            } catch (ex) {
	                errorMessage = "Rangy init listener threw an exception. Continuing. Detail: " + getErrorDesc(ex);
	                consoleLog(errorMessage);
	            }
	        }
	    }
	
	    function deprecationNotice(deprecated, replacement, module) {
	        if (module) {
	            deprecated += " in module " + module.name;
	        }
	        api.warn("DEPRECATED: " + deprecated + " is deprecated. Please use " +
	        replacement + " instead.");
	    }
	
	    function createAliasForDeprecatedMethod(owner, deprecated, replacement, module) {
	        owner[deprecated] = function() {
	            deprecationNotice(deprecated, replacement, module);
	            return owner[replacement].apply(owner, util.toArray(arguments));
	        };
	    }
	
	    util.deprecationNotice = deprecationNotice;
	    util.createAliasForDeprecatedMethod = createAliasForDeprecatedMethod;
	
	    // Allow external scripts to initialize this library in case it's loaded after the document has loaded
	    api.init = init;
	
	    // Execute listener immediately if already initialized
	    api.addInitListener = function(listener) {
	        if (api.initialized) {
	            listener(api);
	        } else {
	            initListeners.push(listener);
	        }
	    };
	
	    var shimListeners = [];
	
	    api.addShimListener = function(listener) {
	        shimListeners.push(listener);
	    };
	
	    function shim(win) {
	        win = win || window;
	        init();
	
	        // Notify listeners
	        for (var i = 0, len = shimListeners.length; i < len; ++i) {
	            shimListeners[i](win);
	        }
	    }
	
	    if (isBrowser) {
	        api.shim = api.createMissingNativeApi = shim;
	        createAliasForDeprecatedMethod(api, "createMissingNativeApi", "shim");
	    }
	
	    function Module(name, dependencies, initializer) {
	        this.name = name;
	        this.dependencies = dependencies;
	        this.initialized = false;
	        this.supported = false;
	        this.initializer = initializer;
	    }
	
	    Module.prototype = {
	        init: function() {
	            var requiredModuleNames = this.dependencies || [];
	            for (var i = 0, len = requiredModuleNames.length, requiredModule, moduleName; i < len; ++i) {
	                moduleName = requiredModuleNames[i];
	
	                requiredModule = modules[moduleName];
	                if (!requiredModule || !(requiredModule instanceof Module)) {
	                    throw new Error("required module '" + moduleName + "' not found");
	                }
	
	                requiredModule.init();
	
	                if (!requiredModule.supported) {
	                    throw new Error("required module '" + moduleName + "' not supported");
	                }
	            }
	
	            // Now run initializer
	            this.initializer(this);
	        },
	
	        fail: function(reason) {
	            this.initialized = true;
	            this.supported = false;
	            throw new Error(reason);
	        },
	
	        warn: function(msg) {
	            api.warn("Module " + this.name + ": " + msg);
	        },
	
	        deprecationNotice: function(deprecated, replacement) {
	            api.warn("DEPRECATED: " + deprecated + " in module " + this.name + " is deprecated. Please use " +
	                replacement + " instead");
	        },
	
	        createError: function(msg) {
	            return new Error("Error in Rangy " + this.name + " module: " + msg);
	        }
	    };
	
	    function createModule(name, dependencies, initFunc) {
	        var newModule = new Module(name, dependencies, function(module) {
	            if (!module.initialized) {
	                module.initialized = true;
	                try {
	                    initFunc(api, module);
	                    module.supported = true;
	                } catch (ex) {
	                    var errorMessage = "Module '" + name + "' failed to load: " + getErrorDesc(ex);
	                    consoleLog(errorMessage);
	                    if (ex.stack) {
	                        consoleLog(ex.stack);
	                    }
	                }
	            }
	        });
	        modules[name] = newModule;
	        return newModule;
	    }
	
	    api.createModule = function(name) {
	        // Allow 2 or 3 arguments (second argument is an optional array of dependencies)
	        var initFunc, dependencies;
	        if (arguments.length == 2) {
	            initFunc = arguments[1];
	            dependencies = [];
	        } else {
	            initFunc = arguments[2];
	            dependencies = arguments[1];
	        }
	
	        var module = createModule(name, dependencies, initFunc);
	
	        // Initialize the module immediately if the core is already initialized
	        if (api.initialized && api.supported) {
	            module.init();
	        }
	    };
	
	    api.createCoreModule = function(name, dependencies, initFunc) {
	        createModule(name, dependencies, initFunc);
	    };
	
	    /*----------------------------------------------------------------------------------------------------------------*/
	
	    // Ensure rangy.rangePrototype and rangy.selectionPrototype are available immediately
	
	    function RangePrototype() {}
	    api.RangePrototype = RangePrototype;
	    api.rangePrototype = new RangePrototype();
	
	    function SelectionPrototype() {}
	    api.selectionPrototype = new SelectionPrototype();
	
	    /*----------------------------------------------------------------------------------------------------------------*/
	
	    // DOM utility methods used by Rangy
	    api.createCoreModule("DomUtil", [], function(api, module) {
	        var UNDEF = "undefined";
	        var util = api.util;
	        var getBody = util.getBody;
	
	        // Perform feature tests
	        if (!util.areHostMethods(document, ["createDocumentFragment", "createElement", "createTextNode"])) {
	            module.fail("document missing a Node creation method");
	        }
	
	        if (!util.isHostMethod(document, "getElementsByTagName")) {
	            module.fail("document missing getElementsByTagName method");
	        }
	
	        var el = document.createElement("div");
	        if (!util.areHostMethods(el, ["insertBefore", "appendChild", "cloneNode"] ||
	                !util.areHostObjects(el, ["previousSibling", "nextSibling", "childNodes", "parentNode"]))) {
	            module.fail("Incomplete Element implementation");
	        }
	
	        // innerHTML is required for Range's createContextualFragment method
	        if (!util.isHostProperty(el, "innerHTML")) {
	            module.fail("Element is missing innerHTML property");
	        }
	
	        var textNode = document.createTextNode("test");
	        if (!util.areHostMethods(textNode, ["splitText", "deleteData", "insertData", "appendData", "cloneNode"] ||
	                !util.areHostObjects(el, ["previousSibling", "nextSibling", "childNodes", "parentNode"]) ||
	                !util.areHostProperties(textNode, ["data"]))) {
	            module.fail("Incomplete Text Node implementation");
	        }
	
	        /*----------------------------------------------------------------------------------------------------------------*/
	
	        // Removed use of indexOf because of a bizarre bug in Opera that is thrown in one of the Acid3 tests. I haven't been
	        // able to replicate it outside of the test. The bug is that indexOf returns -1 when called on an Array that
	        // contains just the document as a single element and the value searched for is the document.
	        var arrayContains = /*Array.prototype.indexOf ?
	            function(arr, val) {
	                return arr.indexOf(val) > -1;
	            }:*/
	
	            function(arr, val) {
	                var i = arr.length;
	                while (i--) {
	                    if (arr[i] === val) {
	                        return true;
	                    }
	                }
	                return false;
	            };
	
	        // Opera 11 puts HTML elements in the null namespace, it seems, and IE 7 has undefined namespaceURI
	        function isHtmlNamespace(node) {
	            var ns;
	            return typeof node.namespaceURI == UNDEF || ((ns = node.namespaceURI) === null || ns == "http://www.w3.org/1999/xhtml");
	        }
	
	        function parentElement(node) {
	            var parent = node.parentNode;
	            return (parent.nodeType == 1) ? parent : null;
	        }
	
	        function getNodeIndex(node) {
	            var i = 0;
	            while( (node = node.previousSibling) ) {
	                ++i;
	            }
	            return i;
	        }
	
	        function getNodeLength(node) {
	            switch (node.nodeType) {
	                case 7:
	                case 10:
	                    return 0;
	                case 3:
	                case 8:
	                    return node.length;
	                default:
	                    return node.childNodes.length;
	            }
	        }
	
	        function getCommonAncestor(node1, node2) {
	            var ancestors = [], n;
	            for (n = node1; n; n = n.parentNode) {
	                ancestors.push(n);
	            }
	
	            for (n = node2; n; n = n.parentNode) {
	                if (arrayContains(ancestors, n)) {
	                    return n;
	                }
	            }
	
	            return null;
	        }
	
	        function isAncestorOf(ancestor, descendant, selfIsAncestor) {
	            var n = selfIsAncestor ? descendant : descendant.parentNode;
	            while (n) {
	                if (n === ancestor) {
	                    return true;
	                } else {
	                    n = n.parentNode;
	                }
	            }
	            return false;
	        }
	
	        function isOrIsAncestorOf(ancestor, descendant) {
	            return isAncestorOf(ancestor, descendant, true);
	        }
	
	        function getClosestAncestorIn(node, ancestor, selfIsAncestor) {
	            var p, n = selfIsAncestor ? node : node.parentNode;
	            while (n) {
	                p = n.parentNode;
	                if (p === ancestor) {
	                    return n;
	                }
	                n = p;
	            }
	            return null;
	        }
	
	        function isCharacterDataNode(node) {
	            var t = node.nodeType;
	            return t == 3 || t == 4 || t == 8 ; // Text, CDataSection or Comment
	        }
	
	        function isTextOrCommentNode(node) {
	            if (!node) {
	                return false;
	            }
	            var t = node.nodeType;
	            return t == 3 || t == 8 ; // Text or Comment
	        }
	
	        function insertAfter(node, precedingNode) {
	            var nextNode = precedingNode.nextSibling, parent = precedingNode.parentNode;
	            if (nextNode) {
	                parent.insertBefore(node, nextNode);
	            } else {
	                parent.appendChild(node);
	            }
	            return node;
	        }
	
	        // Note that we cannot use splitText() because it is bugridden in IE 9.
	        function splitDataNode(node, index, positionsToPreserve) {
	            var newNode = node.cloneNode(false);
	            newNode.deleteData(0, index);
	            node.deleteData(index, node.length - index);
	            insertAfter(newNode, node);
	
	            // Preserve positions
	            if (positionsToPreserve) {
	                for (var i = 0, position; position = positionsToPreserve[i++]; ) {
	                    // Handle case where position was inside the portion of node after the split point
	                    if (position.node == node && position.offset > index) {
	                        position.node = newNode;
	                        position.offset -= index;
	                    }
	                    // Handle the case where the position is a node offset within node's parent
	                    else if (position.node == node.parentNode && position.offset > getNodeIndex(node)) {
	                        ++position.offset;
	                    }
	                }
	            }
	            return newNode;
	        }
	
	        function getDocument(node) {
	            if (node.nodeType == 9) {
	                return node;
	            } else if (typeof node.ownerDocument != UNDEF) {
	                return node.ownerDocument;
	            } else if (typeof node.document != UNDEF) {
	                return node.document;
	            } else if (node.parentNode) {
	                return getDocument(node.parentNode);
	            } else {
	                throw module.createError("getDocument: no document found for node");
	            }
	        }
	
	        function getWindow(node) {
	            var doc = getDocument(node);
	            if (typeof doc.defaultView != UNDEF) {
	                return doc.defaultView;
	            } else if (typeof doc.parentWindow != UNDEF) {
	                return doc.parentWindow;
	            } else {
	                throw module.createError("Cannot get a window object for node");
	            }
	        }
	
	        function getIframeDocument(iframeEl) {
	            if (typeof iframeEl.contentDocument != UNDEF) {
	                return iframeEl.contentDocument;
	            } else if (typeof iframeEl.contentWindow != UNDEF) {
	                return iframeEl.contentWindow.document;
	            } else {
	                throw module.createError("getIframeDocument: No Document object found for iframe element");
	            }
	        }
	
	        function getIframeWindow(iframeEl) {
	            if (typeof iframeEl.contentWindow != UNDEF) {
	                return iframeEl.contentWindow;
	            } else if (typeof iframeEl.contentDocument != UNDEF) {
	                return iframeEl.contentDocument.defaultView;
	            } else {
	                throw module.createError("getIframeWindow: No Window object found for iframe element");
	            }
	        }
	
	        // This looks bad. Is it worth it?
	        function isWindow(obj) {
	            return obj && util.isHostMethod(obj, "setTimeout") && util.isHostObject(obj, "document");
	        }
	
	        function getContentDocument(obj, module, methodName) {
	            var doc;
	
	            if (!obj) {
	                doc = document;
	            }
	
	            // Test if a DOM node has been passed and obtain a document object for it if so
	            else if (util.isHostProperty(obj, "nodeType")) {
	                doc = (obj.nodeType == 1 && obj.tagName.toLowerCase() == "iframe") ?
	                    getIframeDocument(obj) : getDocument(obj);
	            }
	
	            // Test if the doc parameter appears to be a Window object
	            else if (isWindow(obj)) {
	                doc = obj.document;
	            }
	
	            if (!doc) {
	                throw module.createError(methodName + "(): Parameter must be a Window object or DOM node");
	            }
	
	            return doc;
	        }
	
	        function getRootContainer(node) {
	            var parent;
	            while ( (parent = node.parentNode) ) {
	                node = parent;
	            }
	            return node;
	        }
	
	        function comparePoints(nodeA, offsetA, nodeB, offsetB) {
	            // See http://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html#Level-2-Range-Comparing
	            var nodeC, root, childA, childB, n;
	            if (nodeA == nodeB) {
	                // Case 1: nodes are the same
	                return offsetA === offsetB ? 0 : (offsetA < offsetB) ? -1 : 1;
	            } else if ( (nodeC = getClosestAncestorIn(nodeB, nodeA, true)) ) {
	                // Case 2: node C (container B or an ancestor) is a child node of A
	                return offsetA <= getNodeIndex(nodeC) ? -1 : 1;
	            } else if ( (nodeC = getClosestAncestorIn(nodeA, nodeB, true)) ) {
	                // Case 3: node C (container A or an ancestor) is a child node of B
	                return getNodeIndex(nodeC) < offsetB  ? -1 : 1;
	            } else {
	                root = getCommonAncestor(nodeA, nodeB);
	                if (!root) {
	                    throw new Error("comparePoints error: nodes have no common ancestor");
	                }
	
	                // Case 4: containers are siblings or descendants of siblings
	                childA = (nodeA === root) ? root : getClosestAncestorIn(nodeA, root, true);
	                childB = (nodeB === root) ? root : getClosestAncestorIn(nodeB, root, true);
	
	                if (childA === childB) {
	                    // This shouldn't be possible
	                    throw module.createError("comparePoints got to case 4 and childA and childB are the same!");
	                } else {
	                    n = root.firstChild;
	                    while (n) {
	                        if (n === childA) {
	                            return -1;
	                        } else if (n === childB) {
	                            return 1;
	                        }
	                        n = n.nextSibling;
	                    }
	                }
	            }
	        }
	
	        /*----------------------------------------------------------------------------------------------------------------*/
	
	        // Test for IE's crash (IE 6/7) or exception (IE >= 8) when a reference to garbage-collected text node is queried
	        var crashyTextNodes = false;
	
	        function isBrokenNode(node) {
	            var n;
	            try {
	                n = node.parentNode;
	                return false;
	            } catch (e) {
	                return true;
	            }
	        }
	
	        (function() {
	            var el = document.createElement("b");
	            el.innerHTML = "1";
	            var textNode = el.firstChild;
	            el.innerHTML = "<br />";
	            crashyTextNodes = isBrokenNode(textNode);
	
	            api.features.crashyTextNodes = crashyTextNodes;
	        })();
	
	        /*----------------------------------------------------------------------------------------------------------------*/
	
	        function inspectNode(node) {
	            if (!node) {
	                return "[No node]";
	            }
	            if (crashyTextNodes && isBrokenNode(node)) {
	                return "[Broken node]";
	            }
	            if (isCharacterDataNode(node)) {
	                return '"' + node.data + '"';
	            }
	            if (node.nodeType == 1) {
	                var idAttr = node.id ? ' id="' + node.id + '"' : "";
	                return "<" + node.nodeName + idAttr + ">[index:" + getNodeIndex(node) + ",length:" + node.childNodes.length + "][" + (node.innerHTML || "[innerHTML not supported]").slice(0, 25) + "]";
	            }
	            return node.nodeName;
	        }
	
	        function fragmentFromNodeChildren(node) {
	            var fragment = getDocument(node).createDocumentFragment(), child;
	            while ( (child = node.firstChild) ) {
	                fragment.appendChild(child);
	            }
	            return fragment;
	        }
	
	        var getComputedStyleProperty;
	        if (typeof window.getComputedStyle != UNDEF) {
	            getComputedStyleProperty = function(el, propName) {
	                return getWindow(el).getComputedStyle(el, null)[propName];
	            };
	        } else if (typeof document.documentElement.currentStyle != UNDEF) {
	            getComputedStyleProperty = function(el, propName) {
	                return el.currentStyle ? el.currentStyle[propName] : "";
	            };
	        } else {
	            module.fail("No means of obtaining computed style properties found");
	        }
	
	        function createTestElement(doc, html, contentEditable) {
	            var body = getBody(doc);
	            var el = doc.createElement("div");
	            el.contentEditable = "" + !!contentEditable;
	            if (html) {
	                el.innerHTML = html;
	            }
	
	            // Insert the test element at the start of the body to prevent scrolling to the bottom in iOS (issue #292)
	            var bodyFirstChild = body.firstChild;
	            if (bodyFirstChild) {
	                body.insertBefore(el, bodyFirstChild);
	            } else {
	                body.appendChild(el);
	            }
	
	            return el;
	        }
	
	        function removeNode(node) {
	            return node.parentNode.removeChild(node);
	        }
	
	        function NodeIterator(root) {
	            this.root = root;
	            this._next = root;
	        }
	
	        NodeIterator.prototype = {
	            _current: null,
	
	            hasNext: function() {
	                return !!this._next;
	            },
	
	            next: function() {
	                var n = this._current = this._next;
	                var child, next;
	                if (this._current) {
	                    child = n.firstChild;
	                    if (child) {
	                        this._next = child;
	                    } else {
	                        next = null;
	                        while ((n !== this.root) && !(next = n.nextSibling)) {
	                            n = n.parentNode;
	                        }
	                        this._next = next;
	                    }
	                }
	                return this._current;
	            },
	
	            detach: function() {
	                this._current = this._next = this.root = null;
	            }
	        };
	
	        function createIterator(root) {
	            return new NodeIterator(root);
	        }
	
	        function DomPosition(node, offset) {
	            this.node = node;
	            this.offset = offset;
	        }
	
	        DomPosition.prototype = {
	            equals: function(pos) {
	                return !!pos && this.node === pos.node && this.offset == pos.offset;
	            },
	
	            inspect: function() {
	                return "[DomPosition(" + inspectNode(this.node) + ":" + this.offset + ")]";
	            },
	
	            toString: function() {
	                return this.inspect();
	            }
	        };
	
	        function DOMException(codeName) {
	            this.code = this[codeName];
	            this.codeName = codeName;
	            this.message = "DOMException: " + this.codeName;
	        }
	
	        DOMException.prototype = {
	            INDEX_SIZE_ERR: 1,
	            HIERARCHY_REQUEST_ERR: 3,
	            WRONG_DOCUMENT_ERR: 4,
	            NO_MODIFICATION_ALLOWED_ERR: 7,
	            NOT_FOUND_ERR: 8,
	            NOT_SUPPORTED_ERR: 9,
	            INVALID_STATE_ERR: 11,
	            INVALID_NODE_TYPE_ERR: 24
	        };
	
	        DOMException.prototype.toString = function() {
	            return this.message;
	        };
	
	        api.dom = {
	            arrayContains: arrayContains,
	            isHtmlNamespace: isHtmlNamespace,
	            parentElement: parentElement,
	            getNodeIndex: getNodeIndex,
	            getNodeLength: getNodeLength,
	            getCommonAncestor: getCommonAncestor,
	            isAncestorOf: isAncestorOf,
	            isOrIsAncestorOf: isOrIsAncestorOf,
	            getClosestAncestorIn: getClosestAncestorIn,
	            isCharacterDataNode: isCharacterDataNode,
	            isTextOrCommentNode: isTextOrCommentNode,
	            insertAfter: insertAfter,
	            splitDataNode: splitDataNode,
	            getDocument: getDocument,
	            getWindow: getWindow,
	            getIframeWindow: getIframeWindow,
	            getIframeDocument: getIframeDocument,
	            getBody: getBody,
	            isWindow: isWindow,
	            getContentDocument: getContentDocument,
	            getRootContainer: getRootContainer,
	            comparePoints: comparePoints,
	            isBrokenNode: isBrokenNode,
	            inspectNode: inspectNode,
	            getComputedStyleProperty: getComputedStyleProperty,
	            createTestElement: createTestElement,
	            removeNode: removeNode,
	            fragmentFromNodeChildren: fragmentFromNodeChildren,
	            createIterator: createIterator,
	            DomPosition: DomPosition
	        };
	
	        api.DOMException = DOMException;
	    });
	
	    /*----------------------------------------------------------------------------------------------------------------*/
	
	    // Pure JavaScript implementation of DOM Range
	    api.createCoreModule("DomRange", ["DomUtil"], function(api, module) {
	        var dom = api.dom;
	        var util = api.util;
	        var DomPosition = dom.DomPosition;
	        var DOMException = api.DOMException;
	
	        var isCharacterDataNode = dom.isCharacterDataNode;
	        var getNodeIndex = dom.getNodeIndex;
	        var isOrIsAncestorOf = dom.isOrIsAncestorOf;
	        var getDocument = dom.getDocument;
	        var comparePoints = dom.comparePoints;
	        var splitDataNode = dom.splitDataNode;
	        var getClosestAncestorIn = dom.getClosestAncestorIn;
	        var getNodeLength = dom.getNodeLength;
	        var arrayContains = dom.arrayContains;
	        var getRootContainer = dom.getRootContainer;
	        var crashyTextNodes = api.features.crashyTextNodes;
	
	        var removeNode = dom.removeNode;
	
	        /*----------------------------------------------------------------------------------------------------------------*/
	
	        // Utility functions
	
	        function isNonTextPartiallySelected(node, range) {
	            return (node.nodeType != 3) &&
	                   (isOrIsAncestorOf(node, range.startContainer) || isOrIsAncestorOf(node, range.endContainer));
	        }
	
	        function getRangeDocument(range) {
	            return range.document || getDocument(range.startContainer);
	        }
	
	        function getRangeRoot(range) {
	            return getRootContainer(range.startContainer);
	        }
	
	        function getBoundaryBeforeNode(node) {
	            return new DomPosition(node.parentNode, getNodeIndex(node));
	        }
	
	        function getBoundaryAfterNode(node) {
	            return new DomPosition(node.parentNode, getNodeIndex(node) + 1);
	        }
	
	        function insertNodeAtPosition(node, n, o) {
	            var firstNodeInserted = node.nodeType == 11 ? node.firstChild : node;
	            if (isCharacterDataNode(n)) {
	                if (o == n.length) {
	                    dom.insertAfter(node, n);
	                } else {
	                    n.parentNode.insertBefore(node, o == 0 ? n : splitDataNode(n, o));
	                }
	            } else if (o >= n.childNodes.length) {
	                n.appendChild(node);
	            } else {
	                n.insertBefore(node, n.childNodes[o]);
	            }
	            return firstNodeInserted;
	        }
	
	        function rangesIntersect(rangeA, rangeB, touchingIsIntersecting) {
	            assertRangeValid(rangeA);
	            assertRangeValid(rangeB);
	
	            if (getRangeDocument(rangeB) != getRangeDocument(rangeA)) {
	                throw new DOMException("WRONG_DOCUMENT_ERR");
	            }
	
	            var startComparison = comparePoints(rangeA.startContainer, rangeA.startOffset, rangeB.endContainer, rangeB.endOffset),
	                endComparison = comparePoints(rangeA.endContainer, rangeA.endOffset, rangeB.startContainer, rangeB.startOffset);
	
	            return touchingIsIntersecting ? startComparison <= 0 && endComparison >= 0 : startComparison < 0 && endComparison > 0;
	        }
	
	        function cloneSubtree(iterator) {
	            var partiallySelected;
	            for (var node, frag = getRangeDocument(iterator.range).createDocumentFragment(), subIterator; node = iterator.next(); ) {
	                partiallySelected = iterator.isPartiallySelectedSubtree();
	                node = node.cloneNode(!partiallySelected);
	                if (partiallySelected) {
	                    subIterator = iterator.getSubtreeIterator();
	                    node.appendChild(cloneSubtree(subIterator));
	                    subIterator.detach();
	                }
	
	                if (node.nodeType == 10) { // DocumentType
	                    throw new DOMException("HIERARCHY_REQUEST_ERR");
	                }
	                frag.appendChild(node);
	            }
	            return frag;
	        }
	
	        function iterateSubtree(rangeIterator, func, iteratorState) {
	            var it, n;
	            iteratorState = iteratorState || { stop: false };
	            for (var node, subRangeIterator; node = rangeIterator.next(); ) {
	                if (rangeIterator.isPartiallySelectedSubtree()) {
	                    if (func(node) === false) {
	                        iteratorState.stop = true;
	                        return;
	                    } else {
	                        // The node is partially selected by the Range, so we can use a new RangeIterator on the portion of
	                        // the node selected by the Range.
	                        subRangeIterator = rangeIterator.getSubtreeIterator();
	                        iterateSubtree(subRangeIterator, func, iteratorState);
	                        subRangeIterator.detach();
	                        if (iteratorState.stop) {
	                            return;
	                        }
	                    }
	                } else {
	                    // The whole node is selected, so we can use efficient DOM iteration to iterate over the node and its
	                    // descendants
	                    it = dom.createIterator(node);
	                    while ( (n = it.next()) ) {
	                        if (func(n) === false) {
	                            iteratorState.stop = true;
	                            return;
	                        }
	                    }
	                }
	            }
	        }
	
	        function deleteSubtree(iterator) {
	            var subIterator;
	            while (iterator.next()) {
	                if (iterator.isPartiallySelectedSubtree()) {
	                    subIterator = iterator.getSubtreeIterator();
	                    deleteSubtree(subIterator);
	                    subIterator.detach();
	                } else {
	                    iterator.remove();
	                }
	            }
	        }
	
	        function extractSubtree(iterator) {
	            for (var node, frag = getRangeDocument(iterator.range).createDocumentFragment(), subIterator; node = iterator.next(); ) {
	
	                if (iterator.isPartiallySelectedSubtree()) {
	                    node = node.cloneNode(false);
	                    subIterator = iterator.getSubtreeIterator();
	                    node.appendChild(extractSubtree(subIterator));
	                    subIterator.detach();
	                } else {
	                    iterator.remove();
	                }
	                if (node.nodeType == 10) { // DocumentType
	                    throw new DOMException("HIERARCHY_REQUEST_ERR");
	                }
	                frag.appendChild(node);
	            }
	            return frag;
	        }
	
	        function getNodesInRange(range, nodeTypes, filter) {
	            var filterNodeTypes = !!(nodeTypes && nodeTypes.length), regex;
	            var filterExists = !!filter;
	            if (filterNodeTypes) {
	                regex = new RegExp("^(" + nodeTypes.join("|") + ")$");
	            }
	
	            var nodes = [];
	            iterateSubtree(new RangeIterator(range, false), function(node) {
	                if (filterNodeTypes && !regex.test(node.nodeType)) {
	                    return;
	                }
	                if (filterExists && !filter(node)) {
	                    return;
	                }
	                // Don't include a boundary container if it is a character data node and the range does not contain any
	                // of its character data. See issue 190.
	                var sc = range.startContainer;
	                if (node == sc && isCharacterDataNode(sc) && range.startOffset == sc.length) {
	                    return;
	                }
	
	                var ec = range.endContainer;
	                if (node == ec && isCharacterDataNode(ec) && range.endOffset == 0) {
	                    return;
	                }
	
	                nodes.push(node);
	            });
	            return nodes;
	        }
	
	        function inspect(range) {
	            var name = (typeof range.getName == "undefined") ? "Range" : range.getName();
	            return "[" + name + "(" + dom.inspectNode(range.startContainer) + ":" + range.startOffset + ", " +
	                    dom.inspectNode(range.endContainer) + ":" + range.endOffset + ")]";
	        }
	
	        /*----------------------------------------------------------------------------------------------------------------*/
	
	        // RangeIterator code partially borrows from IERange by Tim Ryan (http://github.com/timcameronryan/IERange)
	
	        function RangeIterator(range, clonePartiallySelectedTextNodes) {
	            this.range = range;
	            this.clonePartiallySelectedTextNodes = clonePartiallySelectedTextNodes;
	
	
	            if (!range.collapsed) {
	                this.sc = range.startContainer;
	                this.so = range.startOffset;
	                this.ec = range.endContainer;
	                this.eo = range.endOffset;
	                var root = range.commonAncestorContainer;
	
	                if (this.sc === this.ec && isCharacterDataNode(this.sc)) {
	                    this.isSingleCharacterDataNode = true;
	                    this._first = this._last = this._next = this.sc;
	                } else {
	                    this._first = this._next = (this.sc === root && !isCharacterDataNode(this.sc)) ?
	                        this.sc.childNodes[this.so] : getClosestAncestorIn(this.sc, root, true);
	                    this._last = (this.ec === root && !isCharacterDataNode(this.ec)) ?
	                        this.ec.childNodes[this.eo - 1] : getClosestAncestorIn(this.ec, root, true);
	                }
	            }
	        }
	
	        RangeIterator.prototype = {
	            _current: null,
	            _next: null,
	            _first: null,
	            _last: null,
	            isSingleCharacterDataNode: false,
	
	            reset: function() {
	                this._current = null;
	                this._next = this._first;
	            },
	
	            hasNext: function() {
	                return !!this._next;
	            },
	
	            next: function() {
	                // Move to next node
	                var current = this._current = this._next;
	                if (current) {
	                    this._next = (current !== this._last) ? current.nextSibling : null;
	
	                    // Check for partially selected text nodes
	                    if (isCharacterDataNode(current) && this.clonePartiallySelectedTextNodes) {
	                        if (current === this.ec) {
	                            (current = current.cloneNode(true)).deleteData(this.eo, current.length - this.eo);
	                        }
	                        if (this._current === this.sc) {
	                            (current = current.cloneNode(true)).deleteData(0, this.so);
	                        }
	                    }
	                }
	
	                return current;
	            },
	
	            remove: function() {
	                var current = this._current, start, end;
	
	                if (isCharacterDataNode(current) && (current === this.sc || current === this.ec)) {
	                    start = (current === this.sc) ? this.so : 0;
	                    end = (current === this.ec) ? this.eo : current.length;
	                    if (start != end) {
	                        current.deleteData(start, end - start);
	                    }
	                } else {
	                    if (current.parentNode) {
	                        removeNode(current);
	                    } else {
	                    }
	                }
	            },
	
	            // Checks if the current node is partially selected
	            isPartiallySelectedSubtree: function() {
	                var current = this._current;
	                return isNonTextPartiallySelected(current, this.range);
	            },
	
	            getSubtreeIterator: function() {
	                var subRange;
	                if (this.isSingleCharacterDataNode) {
	                    subRange = this.range.cloneRange();
	                    subRange.collapse(false);
	                } else {
	                    subRange = new Range(getRangeDocument(this.range));
	                    var current = this._current;
	                    var startContainer = current, startOffset = 0, endContainer = current, endOffset = getNodeLength(current);
	
	                    if (isOrIsAncestorOf(current, this.sc)) {
	                        startContainer = this.sc;
	                        startOffset = this.so;
	                    }
	                    if (isOrIsAncestorOf(current, this.ec)) {
	                        endContainer = this.ec;
	                        endOffset = this.eo;
	                    }
	
	                    updateBoundaries(subRange, startContainer, startOffset, endContainer, endOffset);
	                }
	                return new RangeIterator(subRange, this.clonePartiallySelectedTextNodes);
	            },
	
	            detach: function() {
	                this.range = this._current = this._next = this._first = this._last = this.sc = this.so = this.ec = this.eo = null;
	            }
	        };
	
	        /*----------------------------------------------------------------------------------------------------------------*/
	
	        var beforeAfterNodeTypes = [1, 3, 4, 5, 7, 8, 10];
	        var rootContainerNodeTypes = [2, 9, 11];
	        var readonlyNodeTypes = [5, 6, 10, 12];
	        var insertableNodeTypes = [1, 3, 4, 5, 7, 8, 10, 11];
	        var surroundNodeTypes = [1, 3, 4, 5, 7, 8];
	
	        function createAncestorFinder(nodeTypes) {
	            return function(node, selfIsAncestor) {
	                var t, n = selfIsAncestor ? node : node.parentNode;
	                while (n) {
	                    t = n.nodeType;
	                    if (arrayContains(nodeTypes, t)) {
	                        return n;
	                    }
	                    n = n.parentNode;
	                }
	                return null;
	            };
	        }
	
	        var getDocumentOrFragmentContainer = createAncestorFinder( [9, 11] );
	        var getReadonlyAncestor = createAncestorFinder(readonlyNodeTypes);
	        var getDocTypeNotationEntityAncestor = createAncestorFinder( [6, 10, 12] );
	
	        function assertNoDocTypeNotationEntityAncestor(node, allowSelf) {
	            if (getDocTypeNotationEntityAncestor(node, allowSelf)) {
	                throw new DOMException("INVALID_NODE_TYPE_ERR");
	            }
	        }
	
	        function assertValidNodeType(node, invalidTypes) {
	            if (!arrayContains(invalidTypes, node.nodeType)) {
	                throw new DOMException("INVALID_NODE_TYPE_ERR");
	            }
	        }
	
	        function assertValidOffset(node, offset) {
	            if (offset < 0 || offset > (isCharacterDataNode(node) ? node.length : node.childNodes.length)) {
	                throw new DOMException("INDEX_SIZE_ERR");
	            }
	        }
	
	        function assertSameDocumentOrFragment(node1, node2) {
	            if (getDocumentOrFragmentContainer(node1, true) !== getDocumentOrFragmentContainer(node2, true)) {
	                throw new DOMException("WRONG_DOCUMENT_ERR");
	            }
	        }
	
	        function assertNodeNotReadOnly(node) {
	            if (getReadonlyAncestor(node, true)) {
	                throw new DOMException("NO_MODIFICATION_ALLOWED_ERR");
	            }
	        }
	
	        function assertNode(node, codeName) {
	            if (!node) {
	                throw new DOMException(codeName);
	            }
	        }
	
	        function isValidOffset(node, offset) {
	            return offset <= (isCharacterDataNode(node) ? node.length : node.childNodes.length);
	        }
	
	        function isRangeValid(range) {
	            return (!!range.startContainer && !!range.endContainer &&
	                    !(crashyTextNodes && (dom.isBrokenNode(range.startContainer) || dom.isBrokenNode(range.endContainer))) &&
	                    getRootContainer(range.startContainer) == getRootContainer(range.endContainer) &&
	                    isValidOffset(range.startContainer, range.startOffset) &&
	                    isValidOffset(range.endContainer, range.endOffset));
	        }
	
	        function assertRangeValid(range) {
	            if (!isRangeValid(range)) {
	                throw new Error("Range error: Range is not valid. This usually happens after DOM mutation. Range: (" + range.inspect() + ")");
	            }
	        }
	
	        /*----------------------------------------------------------------------------------------------------------------*/
	
	        // Test the browser's innerHTML support to decide how to implement createContextualFragment
	        var styleEl = document.createElement("style");
	        var htmlParsingConforms = false;
	        try {
	            styleEl.innerHTML = "<b>x</b>";
	            htmlParsingConforms = (styleEl.firstChild.nodeType == 3); // Opera incorrectly creates an element node
	        } catch (e) {
	            // IE 6 and 7 throw
	        }
	
	        api.features.htmlParsingConforms = htmlParsingConforms;
	
	        var createContextualFragment = htmlParsingConforms ?
	
	            // Implementation as per HTML parsing spec, trusting in the browser's implementation of innerHTML. See
	            // discussion and base code for this implementation at issue 67.
	            // Spec: http://html5.org/specs/dom-parsing.html#extensions-to-the-range-interface
	            // Thanks to Aleks Williams.
	            function(fragmentStr) {
	                // "Let node the context object's start's node."
	                var node = this.startContainer;
	                var doc = getDocument(node);
	
	                // "If the context object's start's node is null, raise an INVALID_STATE_ERR
	                // exception and abort these steps."
	                if (!node) {
	                    throw new DOMException("INVALID_STATE_ERR");
	                }
	
	                // "Let element be as follows, depending on node's interface:"
	                // Document, Document Fragment: null
	                var el = null;
	
	                // "Element: node"
	                if (node.nodeType == 1) {
	                    el = node;
	
	                // "Text, Comment: node's parentElement"
	                } else if (isCharacterDataNode(node)) {
	                    el = dom.parentElement(node);
	                }
	
	                // "If either element is null or element's ownerDocument is an HTML document
	                // and element's local name is "html" and element's namespace is the HTML
	                // namespace"
	                if (el === null || (
	                    el.nodeName == "HTML" &&
	                    dom.isHtmlNamespace(getDocument(el).documentElement) &&
	                    dom.isHtmlNamespace(el)
	                )) {
	
	                // "let element be a new Element with "body" as its local name and the HTML
	                // namespace as its namespace.""
	                    el = doc.createElement("body");
	                } else {
	                    el = el.cloneNode(false);
	                }
	
	                // "If the node's document is an HTML document: Invoke the HTML fragment parsing algorithm."
	                // "If the node's document is an XML document: Invoke the XML fragment parsing algorithm."
	                // "In either case, the algorithm must be invoked with fragment as the input
	                // and element as the context element."
	                el.innerHTML = fragmentStr;
	
	                // "If this raises an exception, then abort these steps. Otherwise, let new
	                // children be the nodes returned."
	
	                // "Let fragment be a new DocumentFragment."
	                // "Append all new children to fragment."
	                // "Return fragment."
	                return dom.fragmentFromNodeChildren(el);
	            } :
	
	            // In this case, innerHTML cannot be trusted, so fall back to a simpler, non-conformant implementation that
	            // previous versions of Rangy used (with the exception of using a body element rather than a div)
	            function(fragmentStr) {
	                var doc = getRangeDocument(this);
	                var el = doc.createElement("body");
	                el.innerHTML = fragmentStr;
	
	                return dom.fragmentFromNodeChildren(el);
	            };
	
	        function splitRangeBoundaries(range, positionsToPreserve) {
	            assertRangeValid(range);
	
	            var sc = range.startContainer, so = range.startOffset, ec = range.endContainer, eo = range.endOffset;
	            var startEndSame = (sc === ec);
	
	            if (isCharacterDataNode(ec) && eo > 0 && eo < ec.length) {
	                splitDataNode(ec, eo, positionsToPreserve);
	            }
	
	            if (isCharacterDataNode(sc) && so > 0 && so < sc.length) {
	                sc = splitDataNode(sc, so, positionsToPreserve);
	                if (startEndSame) {
	                    eo -= so;
	                    ec = sc;
	                } else if (ec == sc.parentNode && eo >= getNodeIndex(sc)) {
	                    eo++;
	                }
	                so = 0;
	            }
	            range.setStartAndEnd(sc, so, ec, eo);
	        }
	
	        function rangeToHtml(range) {
	            assertRangeValid(range);
	            var container = range.commonAncestorContainer.parentNode.cloneNode(false);
	            container.appendChild( range.cloneContents() );
	            return container.innerHTML;
	        }
	
	        /*----------------------------------------------------------------------------------------------------------------*/
	
	        var rangeProperties = ["startContainer", "startOffset", "endContainer", "endOffset", "collapsed",
	            "commonAncestorContainer"];
	
	        var s2s = 0, s2e = 1, e2e = 2, e2s = 3;
	        var n_b = 0, n_a = 1, n_b_a = 2, n_i = 3;
	
	        util.extend(api.rangePrototype, {
	            compareBoundaryPoints: function(how, range) {
	                assertRangeValid(this);
	                assertSameDocumentOrFragment(this.startContainer, range.startContainer);
	
	                var nodeA, offsetA, nodeB, offsetB;
	                var prefixA = (how == e2s || how == s2s) ? "start" : "end";
	                var prefixB = (how == s2e || how == s2s) ? "start" : "end";
	                nodeA = this[prefixA + "Container"];
	                offsetA = this[prefixA + "Offset"];
	                nodeB = range[prefixB + "Container"];
	                offsetB = range[prefixB + "Offset"];
	                return comparePoints(nodeA, offsetA, nodeB, offsetB);
	            },
	
	            insertNode: function(node) {
	                assertRangeValid(this);
	                assertValidNodeType(node, insertableNodeTypes);
	                assertNodeNotReadOnly(this.startContainer);
	
	                if (isOrIsAncestorOf(node, this.startContainer)) {
	                    throw new DOMException("HIERARCHY_REQUEST_ERR");
	                }
	
	                // No check for whether the container of the start of the Range is of a type that does not allow
	                // children of the type of node: the browser's DOM implementation should do this for us when we attempt
	                // to add the node
	
	                var firstNodeInserted = insertNodeAtPosition(node, this.startContainer, this.startOffset);
	                this.setStartBefore(firstNodeInserted);
	            },
	
	            cloneContents: function() {
	                assertRangeValid(this);
	
	                var clone, frag;
	                if (this.collapsed) {
	                    return getRangeDocument(this).createDocumentFragment();
	                } else {
	                    if (this.startContainer === this.endContainer && isCharacterDataNode(this.startContainer)) {
	                        clone = this.startContainer.cloneNode(true);
	                        clone.data = clone.data.slice(this.startOffset, this.endOffset);
	                        frag = getRangeDocument(this).createDocumentFragment();
	                        frag.appendChild(clone);
	                        return frag;
	                    } else {
	                        var iterator = new RangeIterator(this, true);
	                        clone = cloneSubtree(iterator);
	                        iterator.detach();
	                    }
	                    return clone;
	                }
	            },
	
	            canSurroundContents: function() {
	                assertRangeValid(this);
	                assertNodeNotReadOnly(this.startContainer);
	                assertNodeNotReadOnly(this.endContainer);
	
	                // Check if the contents can be surrounded. Specifically, this means whether the range partially selects
	                // no non-text nodes.
	                var iterator = new RangeIterator(this, true);
	                var boundariesInvalid = (iterator._first && (isNonTextPartiallySelected(iterator._first, this)) ||
	                        (iterator._last && isNonTextPartiallySelected(iterator._last, this)));
	                iterator.detach();
	                return !boundariesInvalid;
	            },
	
	            surroundContents: function(node) {
	                assertValidNodeType(node, surroundNodeTypes);
	
	                if (!this.canSurroundContents()) {
	                    throw new DOMException("INVALID_STATE_ERR");
	                }
	
	                // Extract the contents
	                var content = this.extractContents();
	
	                // Clear the children of the node
	                if (node.hasChildNodes()) {
	                    while (node.lastChild) {
	                        node.removeChild(node.lastChild);
	                    }
	                }
	
	                // Insert the new node and add the extracted contents
	                insertNodeAtPosition(node, this.startContainer, this.startOffset);
	                node.appendChild(content);
	
	                this.selectNode(node);
	            },
	
	            cloneRange: function() {
	                assertRangeValid(this);
	                var range = new Range(getRangeDocument(this));
	                var i = rangeProperties.length, prop;
	                while (i--) {
	                    prop = rangeProperties[i];
	                    range[prop] = this[prop];
	                }
	                return range;
	            },
	
	            toString: function() {
	                assertRangeValid(this);
	                var sc = this.startContainer;
	                if (sc === this.endContainer && isCharacterDataNode(sc)) {
	                    return (sc.nodeType == 3 || sc.nodeType == 4) ? sc.data.slice(this.startOffset, this.endOffset) : "";
	                } else {
	                    var textParts = [], iterator = new RangeIterator(this, true);
	                    iterateSubtree(iterator, function(node) {
	                        // Accept only text or CDATA nodes, not comments
	                        if (node.nodeType == 3 || node.nodeType == 4) {
	                            textParts.push(node.data);
	                        }
	                    });
	                    iterator.detach();
	                    return textParts.join("");
	                }
	            },
	
	            // The methods below are all non-standard. The following batch were introduced by Mozilla but have since
	            // been removed from Mozilla.
	
	            compareNode: function(node) {
	                assertRangeValid(this);
	
	                var parent = node.parentNode;
	                var nodeIndex = getNodeIndex(node);
	
	                if (!parent) {
	                    throw new DOMException("NOT_FOUND_ERR");
	                }
	
	                var startComparison = this.comparePoint(parent, nodeIndex),
	                    endComparison = this.comparePoint(parent, nodeIndex + 1);
	
	                if (startComparison < 0) { // Node starts before
	                    return (endComparison > 0) ? n_b_a : n_b;
	                } else {
	                    return (endComparison > 0) ? n_a : n_i;
	                }
	            },
	
	            comparePoint: function(node, offset) {
	                assertRangeValid(this);
	                assertNode(node, "HIERARCHY_REQUEST_ERR");
	                assertSameDocumentOrFragment(node, this.startContainer);
	
	                if (comparePoints(node, offset, this.startContainer, this.startOffset) < 0) {
	                    return -1;
	                } else if (comparePoints(node, offset, this.endContainer, this.endOffset) > 0) {
	                    return 1;
	                }
	                return 0;
	            },
	
	            createContextualFragment: createContextualFragment,
	
	            toHtml: function() {
	                return rangeToHtml(this);
	            },
	
	            // touchingIsIntersecting determines whether this method considers a node that borders a range intersects
	            // with it (as in WebKit) or not (as in Gecko pre-1.9, and the default)
	            intersectsNode: function(node, touchingIsIntersecting) {
	                assertRangeValid(this);
	                if (getRootContainer(node) != getRangeRoot(this)) {
	                    return false;
	                }
	
	                var parent = node.parentNode, offset = getNodeIndex(node);
	                if (!parent) {
	                    return true;
	                }
	
	                var startComparison = comparePoints(parent, offset, this.endContainer, this.endOffset),
	                    endComparison = comparePoints(parent, offset + 1, this.startContainer, this.startOffset);
	
	                return touchingIsIntersecting ? startComparison <= 0 && endComparison >= 0 : startComparison < 0 && endComparison > 0;
	            },
	
	            isPointInRange: function(node, offset) {
	                assertRangeValid(this);
	                assertNode(node, "HIERARCHY_REQUEST_ERR");
	                assertSameDocumentOrFragment(node, this.startContainer);
	
	                return (comparePoints(node, offset, this.startContainer, this.startOffset) >= 0) &&
	                       (comparePoints(node, offset, this.endContainer, this.endOffset) <= 0);
	            },
	
	            // The methods below are non-standard and invented by me.
	
	            // Sharing a boundary start-to-end or end-to-start does not count as intersection.
	            intersectsRange: function(range) {
	                return rangesIntersect(this, range, false);
	            },
	
	            // Sharing a boundary start-to-end or end-to-start does count as intersection.
	            intersectsOrTouchesRange: function(range) {
	                return rangesIntersect(this, range, true);
	            },
	
	            intersection: function(range) {
	                if (this.intersectsRange(range)) {
	                    var startComparison = comparePoints(this.startContainer, this.startOffset, range.startContainer, range.startOffset),
	                        endComparison = comparePoints(this.endContainer, this.endOffset, range.endContainer, range.endOffset);
	
	                    var intersectionRange = this.cloneRange();
	                    if (startComparison == -1) {
	                        intersectionRange.setStart(range.startContainer, range.startOffset);
	                    }
	                    if (endComparison == 1) {
	                        intersectionRange.setEnd(range.endContainer, range.endOffset);
	                    }
	                    return intersectionRange;
	                }
	                return null;
	            },
	
	            union: function(range) {
	                if (this.intersectsOrTouchesRange(range)) {
	                    var unionRange = this.cloneRange();
	                    if (comparePoints(range.startContainer, range.startOffset, this.startContainer, this.startOffset) == -1) {
	                        unionRange.setStart(range.startContainer, range.startOffset);
	                    }
	                    if (comparePoints(range.endContainer, range.endOffset, this.endContainer, this.endOffset) == 1) {
	                        unionRange.setEnd(range.endContainer, range.endOffset);
	                    }
	                    return unionRange;
	                } else {
	                    throw new DOMException("Ranges do not intersect");
	                }
	            },
	
	            containsNode: function(node, allowPartial) {
	                if (allowPartial) {
	                    return this.intersectsNode(node, false);
	                } else {
	                    return this.compareNode(node) == n_i;
	                }
	            },
	
	            containsNodeContents: function(node) {
	                return this.comparePoint(node, 0) >= 0 && this.comparePoint(node, getNodeLength(node)) <= 0;
	            },
	
	            containsRange: function(range) {
	                var intersection = this.intersection(range);
	                return intersection !== null && range.equals(intersection);
	            },
	
	            containsNodeText: function(node) {
	                var nodeRange = this.cloneRange();
	                nodeRange.selectNode(node);
	                var textNodes = nodeRange.getNodes([3]);
	                if (textNodes.length > 0) {
	                    nodeRange.setStart(textNodes[0], 0);
	                    var lastTextNode = textNodes.pop();
	                    nodeRange.setEnd(lastTextNode, lastTextNode.length);
	                    return this.containsRange(nodeRange);
	                } else {
	                    return this.containsNodeContents(node);
	                }
	            },
	
	            getNodes: function(nodeTypes, filter) {
	                assertRangeValid(this);
	                return getNodesInRange(this, nodeTypes, filter);
	            },
	
	            getDocument: function() {
	                return getRangeDocument(this);
	            },
	
	            collapseBefore: function(node) {
	                this.setEndBefore(node);
	                this.collapse(false);
	            },
	
	            collapseAfter: function(node) {
	                this.setStartAfter(node);
	                this.collapse(true);
	            },
	
	            getBookmark: function(containerNode) {
	                var doc = getRangeDocument(this);
	                var preSelectionRange = api.createRange(doc);
	                containerNode = containerNode || dom.getBody(doc);
	                preSelectionRange.selectNodeContents(containerNode);
	                var range = this.intersection(preSelectionRange);
	                var start = 0, end = 0;
	                if (range) {
	                    preSelectionRange.setEnd(range.startContainer, range.startOffset);
	                    start = preSelectionRange.toString().length;
	                    end = start + range.toString().length;
	                }
	
	                return {
	                    start: start,
	                    end: end,
	                    containerNode: containerNode
	                };
	            },
	
	            moveToBookmark: function(bookmark) {
	                var containerNode = bookmark.containerNode;
	                var charIndex = 0;
	                this.setStart(containerNode, 0);
	                this.collapse(true);
	                var nodeStack = [containerNode], node, foundStart = false, stop = false;
	                var nextCharIndex, i, childNodes;
	
	                while (!stop && (node = nodeStack.pop())) {
	                    if (node.nodeType == 3) {
	                        nextCharIndex = charIndex + node.length;
	                        if (!foundStart && bookmark.start >= charIndex && bookmark.start <= nextCharIndex) {
	                            this.setStart(node, bookmark.start - charIndex);
	                            foundStart = true;
	                        }
	                        if (foundStart && bookmark.end >= charIndex && bookmark.end <= nextCharIndex) {
	                            this.setEnd(node, bookmark.end - charIndex);
	                            stop = true;
	                        }
	                        charIndex = nextCharIndex;
	                    } else {
	                        childNodes = node.childNodes;
	                        i = childNodes.length;
	                        while (i--) {
	                            nodeStack.push(childNodes[i]);
	                        }
	                    }
	                }
	            },
	
	            getName: function() {
	                return "DomRange";
	            },
	
	            equals: function(range) {
	                return Range.rangesEqual(this, range);
	            },
	
	            isValid: function() {
	                return isRangeValid(this);
	            },
	
	            inspect: function() {
	                return inspect(this);
	            },
	
	            detach: function() {
	                // In DOM4, detach() is now a no-op.
	            }
	        });
	
	        function copyComparisonConstantsToObject(obj) {
	            obj.START_TO_START = s2s;
	            obj.START_TO_END = s2e;
	            obj.END_TO_END = e2e;
	            obj.END_TO_START = e2s;
	
	            obj.NODE_BEFORE = n_b;
	            obj.NODE_AFTER = n_a;
	            obj.NODE_BEFORE_AND_AFTER = n_b_a;
	            obj.NODE_INSIDE = n_i;
	        }
	
	        function copyComparisonConstants(constructor) {
	            copyComparisonConstantsToObject(constructor);
	            copyComparisonConstantsToObject(constructor.prototype);
	        }
	
	        function createRangeContentRemover(remover, boundaryUpdater) {
	            return function() {
	                assertRangeValid(this);
	
	                var sc = this.startContainer, so = this.startOffset, root = this.commonAncestorContainer;
	
	                var iterator = new RangeIterator(this, true);
	
	                // Work out where to position the range after content removal
	                var node, boundary;
	                if (sc !== root) {
	                    node = getClosestAncestorIn(sc, root, true);
	                    boundary = getBoundaryAfterNode(node);
	                    sc = boundary.node;
	                    so = boundary.offset;
	                }
	
	                // Check none of the range is read-only
	                iterateSubtree(iterator, assertNodeNotReadOnly);
	
	                iterator.reset();
	
	                // Remove the content
	                var returnValue = remover(iterator);
	                iterator.detach();
	
	                // Move to the new position
	                boundaryUpdater(this, sc, so, sc, so);
	
	                return returnValue;
	            };
	        }
	
	        function createPrototypeRange(constructor, boundaryUpdater) {
	            function createBeforeAfterNodeSetter(isBefore, isStart) {
	                return function(node) {
	                    assertValidNodeType(node, beforeAfterNodeTypes);
	                    assertValidNodeType(getRootContainer(node), rootContainerNodeTypes);
	
	                    var boundary = (isBefore ? getBoundaryBeforeNode : getBoundaryAfterNode)(node);
	                    (isStart ? setRangeStart : setRangeEnd)(this, boundary.node, boundary.offset);
	                };
	            }
	
	            function setRangeStart(range, node, offset) {
	                var ec = range.endContainer, eo = range.endOffset;
	                if (node !== range.startContainer || offset !== range.startOffset) {
	                    // Check the root containers of the range and the new boundary, and also check whether the new boundary
	                    // is after the current end. In either case, collapse the range to the new position
	                    if (getRootContainer(node) != getRootContainer(ec) || comparePoints(node, offset, ec, eo) == 1) {
	                        ec = node;
	                        eo = offset;
	                    }
	                    boundaryUpdater(range, node, offset, ec, eo);
	                }
	            }
	
	            function setRangeEnd(range, node, offset) {
	                var sc = range.startContainer, so = range.startOffset;
	                if (node !== range.endContainer || offset !== range.endOffset) {
	                    // Check the root containers of the range and the new boundary, and also check whether the new boundary
	                    // is after the current end. In either case, collapse the range to the new position
	                    if (getRootContainer(node) != getRootContainer(sc) || comparePoints(node, offset, sc, so) == -1) {
	                        sc = node;
	                        so = offset;
	                    }
	                    boundaryUpdater(range, sc, so, node, offset);
	                }
	            }
	
	            // Set up inheritance
	            var F = function() {};
	            F.prototype = api.rangePrototype;
	            constructor.prototype = new F();
	
	            util.extend(constructor.prototype, {
	                setStart: function(node, offset) {
	                    assertNoDocTypeNotationEntityAncestor(node, true);
	                    assertValidOffset(node, offset);
	
	                    setRangeStart(this, node, offset);
	                },
	
	                setEnd: function(node, offset) {
	                    assertNoDocTypeNotationEntityAncestor(node, true);
	                    assertValidOffset(node, offset);
	
	                    setRangeEnd(this, node, offset);
	                },
	
	                /**
	                 * Convenience method to set a range's start and end boundaries. Overloaded as follows:
	                 * - Two parameters (node, offset) creates a collapsed range at that position
	                 * - Three parameters (node, startOffset, endOffset) creates a range contained with node starting at
	                 *   startOffset and ending at endOffset
	                 * - Four parameters (startNode, startOffset, endNode, endOffset) creates a range starting at startOffset in
	                 *   startNode and ending at endOffset in endNode
	                 */
	                setStartAndEnd: function() {
	                    var args = arguments;
	                    var sc = args[0], so = args[1], ec = sc, eo = so;
	
	                    switch (args.length) {
	                        case 3:
	                            eo = args[2];
	                            break;
	                        case 4:
	                            ec = args[2];
	                            eo = args[3];
	                            break;
	                    }
	
	                    boundaryUpdater(this, sc, so, ec, eo);
	                },
	
	                setBoundary: function(node, offset, isStart) {
	                    this["set" + (isStart ? "Start" : "End")](node, offset);
	                },
	
	                setStartBefore: createBeforeAfterNodeSetter(true, true),
	                setStartAfter: createBeforeAfterNodeSetter(false, true),
	                setEndBefore: createBeforeAfterNodeSetter(true, false),
	                setEndAfter: createBeforeAfterNodeSetter(false, false),
	
	                collapse: function(isStart) {
	                    assertRangeValid(this);
	                    if (isStart) {
	                        boundaryUpdater(this, this.startContainer, this.startOffset, this.startContainer, this.startOffset);
	                    } else {
	                        boundaryUpdater(this, this.endContainer, this.endOffset, this.endContainer, this.endOffset);
	                    }
	                },
	
	                selectNodeContents: function(node) {
	                    assertNoDocTypeNotationEntityAncestor(node, true);
	
	                    boundaryUpdater(this, node, 0, node, getNodeLength(node));
	                },
	
	                selectNode: function(node) {
	                    assertNoDocTypeNotationEntityAncestor(node, false);
	                    assertValidNodeType(node, beforeAfterNodeTypes);
	
	                    var start = getBoundaryBeforeNode(node), end = getBoundaryAfterNode(node);
	                    boundaryUpdater(this, start.node, start.offset, end.node, end.offset);
	                },
	
	                extractContents: createRangeContentRemover(extractSubtree, boundaryUpdater),
	
	                deleteContents: createRangeContentRemover(deleteSubtree, boundaryUpdater),
	
	                canSurroundContents: function() {
	                    assertRangeValid(this);
	                    assertNodeNotReadOnly(this.startContainer);
	                    assertNodeNotReadOnly(this.endContainer);
	
	                    // Check if the contents can be surrounded. Specifically, this means whether the range partially selects
	                    // no non-text nodes.
	                    var iterator = new RangeIterator(this, true);
	                    var boundariesInvalid = (iterator._first && isNonTextPartiallySelected(iterator._first, this) ||
	                            (iterator._last && isNonTextPartiallySelected(iterator._last, this)));
	                    iterator.detach();
	                    return !boundariesInvalid;
	                },
	
	                splitBoundaries: function() {
	                    splitRangeBoundaries(this);
	                },
	
	                splitBoundariesPreservingPositions: function(positionsToPreserve) {
	                    splitRangeBoundaries(this, positionsToPreserve);
	                },
	
	                normalizeBoundaries: function() {
	                    assertRangeValid(this);
	
	                    var sc = this.startContainer, so = this.startOffset, ec = this.endContainer, eo = this.endOffset;
	
	                    var mergeForward = function(node) {
	                        var sibling = node.nextSibling;
	                        if (sibling && sibling.nodeType == node.nodeType) {
	                            ec = node;
	                            eo = node.length;
	                            node.appendData(sibling.data);
	                            removeNode(sibling);
	                        }
	                    };
	
	                    var mergeBackward = function(node) {
	                        var sibling = node.previousSibling;
	                        if (sibling && sibling.nodeType == node.nodeType) {
	                            sc = node;
	                            var nodeLength = node.length;
	                            so = sibling.length;
	                            node.insertData(0, sibling.data);
	                            removeNode(sibling);
	                            if (sc == ec) {
	                                eo += so;
	                                ec = sc;
	                            } else if (ec == node.parentNode) {
	                                var nodeIndex = getNodeIndex(node);
	                                if (eo == nodeIndex) {
	                                    ec = node;
	                                    eo = nodeLength;
	                                } else if (eo > nodeIndex) {
	                                    eo--;
	                                }
	                            }
	                        }
	                    };
	
	                    var normalizeStart = true;
	                    var sibling;
	
	                    if (isCharacterDataNode(ec)) {
	                        if (eo == ec.length) {
	                            mergeForward(ec);
	                        } else if (eo == 0) {
	                            sibling = ec.previousSibling;
	                            if (sibling && sibling.nodeType == ec.nodeType) {
	                                eo = sibling.length;
	                                if (sc == ec) {
	                                    normalizeStart = false;
	                                }
	                                sibling.appendData(ec.data);
	                                removeNode(ec);
	                                ec = sibling;
	                            }
	                        }
	                    } else {
	                        if (eo > 0) {
	                            var endNode = ec.childNodes[eo - 1];
	                            if (endNode && isCharacterDataNode(endNode)) {
	                                mergeForward(endNode);
	                            }
	                        }
	                        normalizeStart = !this.collapsed;
	                    }
	
	                    if (normalizeStart) {
	                        if (isCharacterDataNode(sc)) {
	                            if (so == 0) {
	                                mergeBackward(sc);
	                            } else if (so == sc.length) {
	                                sibling = sc.nextSibling;
	                                if (sibling && sibling.nodeType == sc.nodeType) {
	                                    if (ec == sibling) {
	                                        ec = sc;
	                                        eo += sc.length;
	                                    }
	                                    sc.appendData(sibling.data);
	                                    removeNode(sibling);
	                                }
	                            }
	                        } else {
	                            if (so < sc.childNodes.length) {
	                                var startNode = sc.childNodes[so];
	                                if (startNode && isCharacterDataNode(startNode)) {
	                                    mergeBackward(startNode);
	                                }
	                            }
	                        }
	                    } else {
	                        sc = ec;
	                        so = eo;
	                    }
	
	                    boundaryUpdater(this, sc, so, ec, eo);
	                },
	
	                collapseToPoint: function(node, offset) {
	                    assertNoDocTypeNotationEntityAncestor(node, true);
	                    assertValidOffset(node, offset);
	                    this.setStartAndEnd(node, offset);
	                }
	            });
	
	            copyComparisonConstants(constructor);
	        }
	
	        /*----------------------------------------------------------------------------------------------------------------*/
	
	        // Updates commonAncestorContainer and collapsed after boundary change
	        function updateCollapsedAndCommonAncestor(range) {
	            range.collapsed = (range.startContainer === range.endContainer && range.startOffset === range.endOffset);
	            range.commonAncestorContainer = range.collapsed ?
	                range.startContainer : dom.getCommonAncestor(range.startContainer, range.endContainer);
	        }
	
	        function updateBoundaries(range, startContainer, startOffset, endContainer, endOffset) {
	            range.startContainer = startContainer;
	            range.startOffset = startOffset;
	            range.endContainer = endContainer;
	            range.endOffset = endOffset;
	            range.document = dom.getDocument(startContainer);
	
	            updateCollapsedAndCommonAncestor(range);
	        }
	
	        function Range(doc) {
	            this.startContainer = doc;
	            this.startOffset = 0;
	            this.endContainer = doc;
	            this.endOffset = 0;
	            this.document = doc;
	            updateCollapsedAndCommonAncestor(this);
	        }
	
	        createPrototypeRange(Range, updateBoundaries);
	
	        util.extend(Range, {
	            rangeProperties: rangeProperties,
	            RangeIterator: RangeIterator,
	            copyComparisonConstants: copyComparisonConstants,
	            createPrototypeRange: createPrototypeRange,
	            inspect: inspect,
	            toHtml: rangeToHtml,
	            getRangeDocument: getRangeDocument,
	            rangesEqual: function(r1, r2) {
	                return r1.startContainer === r2.startContainer &&
	                    r1.startOffset === r2.startOffset &&
	                    r1.endContainer === r2.endContainer &&
	                    r1.endOffset === r2.endOffset;
	            }
	        });
	
	        api.DomRange = Range;
	    });
	
	    /*----------------------------------------------------------------------------------------------------------------*/
	
	    // Wrappers for the browser's native DOM Range and/or TextRange implementation
	    api.createCoreModule("WrappedRange", ["DomRange"], function(api, module) {
	        var WrappedRange, WrappedTextRange;
	        var dom = api.dom;
	        var util = api.util;
	        var DomPosition = dom.DomPosition;
	        var DomRange = api.DomRange;
	        var getBody = dom.getBody;
	        var getContentDocument = dom.getContentDocument;
	        var isCharacterDataNode = dom.isCharacterDataNode;
	
	
	        /*----------------------------------------------------------------------------------------------------------------*/
	
	        if (api.features.implementsDomRange) {
	            // This is a wrapper around the browser's native DOM Range. It has two aims:
	            // - Provide workarounds for specific browser bugs
	            // - provide convenient extensions, which are inherited from Rangy's DomRange
	
	            (function() {
	                var rangeProto;
	                var rangeProperties = DomRange.rangeProperties;
	
	                function updateRangeProperties(range) {
	                    var i = rangeProperties.length, prop;
	                    while (i--) {
	                        prop = rangeProperties[i];
	                        range[prop] = range.nativeRange[prop];
	                    }
	                    // Fix for broken collapsed property in IE 9.
	                    range.collapsed = (range.startContainer === range.endContainer && range.startOffset === range.endOffset);
	                }
	
	                function updateNativeRange(range, startContainer, startOffset, endContainer, endOffset) {
	                    var startMoved = (range.startContainer !== startContainer || range.startOffset != startOffset);
	                    var endMoved = (range.endContainer !== endContainer || range.endOffset != endOffset);
	                    var nativeRangeDifferent = !range.equals(range.nativeRange);
	
	                    // Always set both boundaries for the benefit of IE9 (see issue 35)
	                    if (startMoved || endMoved || nativeRangeDifferent) {
	                        range.setEnd(endContainer, endOffset);
	                        range.setStart(startContainer, startOffset);
	                    }
	                }
	
	                var createBeforeAfterNodeSetter;
	
	                WrappedRange = function(range) {
	                    if (!range) {
	                        throw module.createError("WrappedRange: Range must be specified");
	                    }
	                    this.nativeRange = range;
	                    updateRangeProperties(this);
	                };
	
	                DomRange.createPrototypeRange(WrappedRange, updateNativeRange);
	
	                rangeProto = WrappedRange.prototype;
	
	                rangeProto.selectNode = function(node) {
	                    this.nativeRange.selectNode(node);
	                    updateRangeProperties(this);
	                };
	
	                rangeProto.cloneContents = function() {
	                    return this.nativeRange.cloneContents();
	                };
	
	                // Due to a long-standing Firefox bug that I have not been able to find a reliable way to detect,
	                // insertNode() is never delegated to the native range.
	
	                rangeProto.surroundContents = function(node) {
	                    this.nativeRange.surroundContents(node);
	                    updateRangeProperties(this);
	                };
	
	                rangeProto.collapse = function(isStart) {
	                    this.nativeRange.collapse(isStart);
	                    updateRangeProperties(this);
	                };
	
	                rangeProto.cloneRange = function() {
	                    return new WrappedRange(this.nativeRange.cloneRange());
	                };
	
	                rangeProto.refresh = function() {
	                    updateRangeProperties(this);
	                };
	
	                rangeProto.toString = function() {
	                    return this.nativeRange.toString();
	                };
	
	                // Create test range and node for feature detection
	
	                var testTextNode = document.createTextNode("test");
	                getBody(document).appendChild(testTextNode);
	                var range = document.createRange();
	
	                /*--------------------------------------------------------------------------------------------------------*/
	
	                // Test for Firefox 2 bug that prevents moving the start of a Range to a point after its current end and
	                // correct for it
	
	                range.setStart(testTextNode, 0);
	                range.setEnd(testTextNode, 0);
	
	                try {
	                    range.setStart(testTextNode, 1);
	
	                    rangeProto.setStart = function(node, offset) {
	                        this.nativeRange.setStart(node, offset);
	                        updateRangeProperties(this);
	                    };
	
	                    rangeProto.setEnd = function(node, offset) {
	                        this.nativeRange.setEnd(node, offset);
	                        updateRangeProperties(this);
	                    };
	
	                    createBeforeAfterNodeSetter = function(name) {
	                        return function(node) {
	                            this.nativeRange[name](node);
	                            updateRangeProperties(this);
	                        };
	                    };
	
	                } catch(ex) {
	
	                    rangeProto.setStart = function(node, offset) {
	                        try {
	                            this.nativeRange.setStart(node, offset);
	                        } catch (ex) {
	                            this.nativeRange.setEnd(node, offset);
	                            this.nativeRange.setStart(node, offset);
	                        }
	                        updateRangeProperties(this);
	                    };
	
	                    rangeProto.setEnd = function(node, offset) {
	                        try {
	                            this.nativeRange.setEnd(node, offset);
	                        } catch (ex) {
	                            this.nativeRange.setStart(node, offset);
	                            this.nativeRange.setEnd(node, offset);
	                        }
	                        updateRangeProperties(this);
	                    };
	
	                    createBeforeAfterNodeSetter = function(name, oppositeName) {
	                        return function(node) {
	                            try {
	                                this.nativeRange[name](node);
	                            } catch (ex) {
	                                this.nativeRange[oppositeName](node);
	                                this.nativeRange[name](node);
	                            }
	                            updateRangeProperties(this);
	                        };
	                    };
	                }
	
	                rangeProto.setStartBefore = createBeforeAfterNodeSetter("setStartBefore", "setEndBefore");
	                rangeProto.setStartAfter = createBeforeAfterNodeSetter("setStartAfter", "setEndAfter");
	                rangeProto.setEndBefore = createBeforeAfterNodeSetter("setEndBefore", "setStartBefore");
	                rangeProto.setEndAfter = createBeforeAfterNodeSetter("setEndAfter", "setStartAfter");
	
	                /*--------------------------------------------------------------------------------------------------------*/
	
	                // Always use DOM4-compliant selectNodeContents implementation: it's simpler and less code than testing
	                // whether the native implementation can be trusted
	                rangeProto.selectNodeContents = function(node) {
	                    this.setStartAndEnd(node, 0, dom.getNodeLength(node));
	                };
	
	                /*--------------------------------------------------------------------------------------------------------*/
	
	                // Test for and correct WebKit bug that has the behaviour of compareBoundaryPoints round the wrong way for
	                // constants START_TO_END and END_TO_START: https://bugs.webkit.org/show_bug.cgi?id=20738
	
	                range.selectNodeContents(testTextNode);
	                range.setEnd(testTextNode, 3);
	
	                var range2 = document.createRange();
	                range2.selectNodeContents(testTextNode);
	                range2.setEnd(testTextNode, 4);
	                range2.setStart(testTextNode, 2);
	
	                if (range.compareBoundaryPoints(range.START_TO_END, range2) == -1 &&
	                        range.compareBoundaryPoints(range.END_TO_START, range2) == 1) {
	                    // This is the wrong way round, so correct for it
	
	                    rangeProto.compareBoundaryPoints = function(type, range) {
	                        range = range.nativeRange || range;
	                        if (type == range.START_TO_END) {
	                            type = range.END_TO_START;
	                        } else if (type == range.END_TO_START) {
	                            type = range.START_TO_END;
	                        }
	                        return this.nativeRange.compareBoundaryPoints(type, range);
	                    };
	                } else {
	                    rangeProto.compareBoundaryPoints = function(type, range) {
	                        return this.nativeRange.compareBoundaryPoints(type, range.nativeRange || range);
	                    };
	                }
	
	                /*--------------------------------------------------------------------------------------------------------*/
	
	                // Test for IE deleteContents() and extractContents() bug and correct it. See issue 107.
	
	                var el = document.createElement("div");
	                el.innerHTML = "123";
	                var textNode = el.firstChild;
	                var body = getBody(document);
	                body.appendChild(el);
	
	                range.setStart(textNode, 1);
	                range.setEnd(textNode, 2);
	                range.deleteContents();
	
	                if (textNode.data == "13") {
	                    // Behaviour is correct per DOM4 Range so wrap the browser's implementation of deleteContents() and
	                    // extractContents()
	                    rangeProto.deleteContents = function() {
	                        this.nativeRange.deleteContents();
	                        updateRangeProperties(this);
	                    };
	
	                    rangeProto.extractContents = function() {
	                        var frag = this.nativeRange.extractContents();
	                        updateRangeProperties(this);
	                        return frag;
	                    };
	                } else {
	                }
	
	                body.removeChild(el);
	                body = null;
	
	                /*--------------------------------------------------------------------------------------------------------*/
	
	                // Test for existence of createContextualFragment and delegate to it if it exists
	                if (util.isHostMethod(range, "createContextualFragment")) {
	                    rangeProto.createContextualFragment = function(fragmentStr) {
	                        return this.nativeRange.createContextualFragment(fragmentStr);
	                    };
	                }
	
	                /*--------------------------------------------------------------------------------------------------------*/
	
	                // Clean up
	                getBody(document).removeChild(testTextNode);
	
	                rangeProto.getName = function() {
	                    return "WrappedRange";
	                };
	
	                api.WrappedRange = WrappedRange;
	
	                api.createNativeRange = function(doc) {
	                    doc = getContentDocument(doc, module, "createNativeRange");
	                    return doc.createRange();
	                };
	            })();
	        }
	
	        if (api.features.implementsTextRange) {
	            /*
	            This is a workaround for a bug where IE returns the wrong container element from the TextRange's parentElement()
	            method. For example, in the following (where pipes denote the selection boundaries):
	
	            <ul id="ul"><li id="a">| a </li><li id="b"> b |</li></ul>
	
	            var range = document.selection.createRange();
	            alert(range.parentElement().id); // Should alert "ul" but alerts "b"
	
	            This method returns the common ancestor node of the following:
	            - the parentElement() of the textRange
	            - the parentElement() of the textRange after calling collapse(true)
	            - the parentElement() of the textRange after calling collapse(false)
	            */
	            var getTextRangeContainerElement = function(textRange) {
	                var parentEl = textRange.parentElement();
	                var range = textRange.duplicate();
	                range.collapse(true);
	                var startEl = range.parentElement();
	                range = textRange.duplicate();
	                range.collapse(false);
	                var endEl = range.parentElement();
	                var startEndContainer = (startEl == endEl) ? startEl : dom.getCommonAncestor(startEl, endEl);
	
	                return startEndContainer == parentEl ? startEndContainer : dom.getCommonAncestor(parentEl, startEndContainer);
	            };
	
	            var textRangeIsCollapsed = function(textRange) {
	                return textRange.compareEndPoints("StartToEnd", textRange) == 0;
	            };
	
	            // Gets the boundary of a TextRange expressed as a node and an offset within that node. This function started
	            // out as an improved version of code found in Tim Cameron Ryan's IERange (http://code.google.com/p/ierange/)
	            // but has grown, fixing problems with line breaks in preformatted text, adding workaround for IE TextRange
	            // bugs, handling for inputs and images, plus optimizations.
	            var getTextRangeBoundaryPosition = function(textRange, wholeRangeContainerElement, isStart, isCollapsed, startInfo) {
	                var workingRange = textRange.duplicate();
	                workingRange.collapse(isStart);
	                var containerElement = workingRange.parentElement();
	
	                // Sometimes collapsing a TextRange that's at the start of a text node can move it into the previous node, so
	                // check for that
	                if (!dom.isOrIsAncestorOf(wholeRangeContainerElement, containerElement)) {
	                    containerElement = wholeRangeContainerElement;
	                }
	
	
	                // Deal with nodes that cannot "contain rich HTML markup". In practice, this means form inputs, images and
	                // similar. See http://msdn.microsoft.com/en-us/library/aa703950%28VS.85%29.aspx
	                if (!containerElement.canHaveHTML) {
	                    var pos = new DomPosition(containerElement.parentNode, dom.getNodeIndex(containerElement));
	                    return {
	                        boundaryPosition: pos,
	                        nodeInfo: {
	                            nodeIndex: pos.offset,
	                            containerElement: pos.node
	                        }
	                    };
	                }
	
	                var workingNode = dom.getDocument(containerElement).createElement("span");
	
	                // Workaround for HTML5 Shiv's insane violation of document.createElement(). See Rangy issue 104 and HTML5
	                // Shiv issue 64: https://github.com/aFarkas/html5shiv/issues/64
	                if (workingNode.parentNode) {
	                    dom.removeNode(workingNode);
	                }
	
	                var comparison, workingComparisonType = isStart ? "StartToStart" : "StartToEnd";
	                var previousNode, nextNode, boundaryPosition, boundaryNode;
	                var start = (startInfo && startInfo.containerElement == containerElement) ? startInfo.nodeIndex : 0;
	                var childNodeCount = containerElement.childNodes.length;
	                var end = childNodeCount;
	
	                // Check end first. Code within the loop assumes that the endth child node of the container is definitely
	                // after the range boundary.
	                var nodeIndex = end;
	
	                while (true) {
	                    if (nodeIndex == childNodeCount) {
	                        containerElement.appendChild(workingNode);
	                    } else {
	                        containerElement.insertBefore(workingNode, containerElement.childNodes[nodeIndex]);
	                    }
	                    workingRange.moveToElementText(workingNode);
	                    comparison = workingRange.compareEndPoints(workingComparisonType, textRange);
	                    if (comparison == 0 || start == end) {
	                        break;
	                    } else if (comparison == -1) {
	                        if (end == start + 1) {
	                            // We know the endth child node is after the range boundary, so we must be done.
	                            break;
	                        } else {
	                            start = nodeIndex;
	                        }
	                    } else {
	                        end = (end == start + 1) ? start : nodeIndex;
	                    }
	                    nodeIndex = Math.floor((start + end) / 2);
	                    containerElement.removeChild(workingNode);
	                }
	
	
	                // We've now reached or gone past the boundary of the text range we're interested in
	                // so have identified the node we want
	                boundaryNode = workingNode.nextSibling;
	
	                if (comparison == -1 && boundaryNode && isCharacterDataNode(boundaryNode)) {
	                    // This is a character data node (text, comment, cdata). The working range is collapsed at the start of
	                    // the node containing the text range's boundary, so we move the end of the working range to the
	                    // boundary point and measure the length of its text to get the boundary's offset within the node.
	                    workingRange.setEndPoint(isStart ? "EndToStart" : "EndToEnd", textRange);
	
	                    var offset;
	
	                    if (/[\r\n]/.test(boundaryNode.data)) {
	                        /*
	                        For the particular case of a boundary within a text node containing rendered line breaks (within a
	                        <pre> element, for example), we need a slightly complicated approach to get the boundary's offset in
	                        IE. The facts:
	
	                        - Each line break is represented as \r in the text node's data/nodeValue properties
	                        - Each line break is represented as \r\n in the TextRange's 'text' property
	                        - The 'text' property of the TextRange does not contain trailing line breaks
	
	                        To get round the problem presented by the final fact above, we can use the fact that TextRange's
	                        moveStart() and moveEnd() methods return the actual number of characters moved, which is not
	                        necessarily the same as the number of characters it was instructed to move. The simplest approach is
	                        to use this to store the characters moved when moving both the start and end of the range to the
	                        start of the document body and subtracting the start offset from the end offset (the
	                        "move-negative-gazillion" method). However, this is extremely slow when the document is large and
	                        the range is near the end of it. Clearly doing the mirror image (i.e. moving the range boundaries to
	                        the end of the document) has the same problem.
	
	                        Another approach that works is to use moveStart() to move the start boundary of the range up to the
	                        end boundary one character at a time and incrementing a counter with the value returned by the
	                        moveStart() call. However, the check for whether the start boundary has reached the end boundary is
	                        expensive, so this method is slow (although unlike "move-negative-gazillion" is largely unaffected
	                        by the location of the range within the document).
	
	                        The approach used below is a hybrid of the two methods above. It uses the fact that a string
	                        containing the TextRange's 'text' property with each \r\n converted to a single \r character cannot
	                        be longer than the text of the TextRange, so the start of the range is moved that length initially
	                        and then a character at a time to make up for any trailing line breaks not contained in the 'text'
	                        property. This has good performance in most situations compared to the previous two methods.
	                        */
	                        var tempRange = workingRange.duplicate();
	                        var rangeLength = tempRange.text.replace(/\r\n/g, "\r").length;
	
	                        offset = tempRange.moveStart("character", rangeLength);
	                        while ( (comparison = tempRange.compareEndPoints("StartToEnd", tempRange)) == -1) {
	                            offset++;
	                            tempRange.moveStart("character", 1);
	                        }
	                    } else {
	                        offset = workingRange.text.length;
	                    }
	                    boundaryPosition = new DomPosition(boundaryNode, offset);
	                } else {
	
	                    // If the boundary immediately follows a character data node and this is the end boundary, we should favour
	                    // a position within that, and likewise for a start boundary preceding a character data node
	                    previousNode = (isCollapsed || !isStart) && workingNode.previousSibling;
	                    nextNode = (isCollapsed || isStart) && workingNode.nextSibling;
	                    if (nextNode && isCharacterDataNode(nextNode)) {
	                        boundaryPosition = new DomPosition(nextNode, 0);
	                    } else if (previousNode && isCharacterDataNode(previousNode)) {
	                        boundaryPosition = new DomPosition(previousNode, previousNode.data.length);
	                    } else {
	                        boundaryPosition = new DomPosition(containerElement, dom.getNodeIndex(workingNode));
	                    }
	                }
	
	                // Clean up
	                dom.removeNode(workingNode);
	
	                return {
	                    boundaryPosition: boundaryPosition,
	                    nodeInfo: {
	                        nodeIndex: nodeIndex,
	                        containerElement: containerElement
	                    }
	                };
	            };
	
	            // Returns a TextRange representing the boundary of a TextRange expressed as a node and an offset within that
	            // node. This function started out as an optimized version of code found in Tim Cameron Ryan's IERange
	            // (http://code.google.com/p/ierange/)
	            var createBoundaryTextRange = function(boundaryPosition, isStart) {
	                var boundaryNode, boundaryParent, boundaryOffset = boundaryPosition.offset;
	                var doc = dom.getDocument(boundaryPosition.node);
	                var workingNode, childNodes, workingRange = getBody(doc).createTextRange();
	                var nodeIsDataNode = isCharacterDataNode(boundaryPosition.node);
	
	                if (nodeIsDataNode) {
	                    boundaryNode = boundaryPosition.node;
	                    boundaryParent = boundaryNode.parentNode;
	                } else {
	                    childNodes = boundaryPosition.node.childNodes;
	                    boundaryNode = (boundaryOffset < childNodes.length) ? childNodes[boundaryOffset] : null;
	                    boundaryParent = boundaryPosition.node;
	                }
	
	                // Position the range immediately before the node containing the boundary
	                workingNode = doc.createElement("span");
	
	                // Making the working element non-empty element persuades IE to consider the TextRange boundary to be within
	                // the element rather than immediately before or after it
	                workingNode.innerHTML = "&#feff;";
	
	                // insertBefore is supposed to work like appendChild if the second parameter is null. However, a bug report
	                // for IERange suggests that it can crash the browser: http://code.google.com/p/ierange/issues/detail?id=12
	                if (boundaryNode) {
	                    boundaryParent.insertBefore(workingNode, boundaryNode);
	                } else {
	                    boundaryParent.appendChild(workingNode);
	                }
	
	                workingRange.moveToElementText(workingNode);
	                workingRange.collapse(!isStart);
	
	                // Clean up
	                boundaryParent.removeChild(workingNode);
	
	                // Move the working range to the text offset, if required
	                if (nodeIsDataNode) {
	                    workingRange[isStart ? "moveStart" : "moveEnd"]("character", boundaryOffset);
	                }
	
	                return workingRange;
	            };
	
	            /*------------------------------------------------------------------------------------------------------------*/
	
	            // This is a wrapper around a TextRange, providing full DOM Range functionality using rangy's DomRange as a
	            // prototype
	
	            WrappedTextRange = function(textRange) {
	                this.textRange = textRange;
	                this.refresh();
	            };
	
	            WrappedTextRange.prototype = new DomRange(document);
	
	            WrappedTextRange.prototype.refresh = function() {
	                var start, end, startBoundary;
	
	                // TextRange's parentElement() method cannot be trusted. getTextRangeContainerElement() works around that.
	                var rangeContainerElement = getTextRangeContainerElement(this.textRange);
	
	                if (textRangeIsCollapsed(this.textRange)) {
	                    end = start = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, true,
	                        true).boundaryPosition;
	                } else {
	                    startBoundary = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, true, false);
	                    start = startBoundary.boundaryPosition;
	
	                    // An optimization used here is that if the start and end boundaries have the same parent element, the
	                    // search scope for the end boundary can be limited to exclude the portion of the element that precedes
	                    // the start boundary
	                    end = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, false, false,
	                        startBoundary.nodeInfo).boundaryPosition;
	                }
	
	                this.setStart(start.node, start.offset);
	                this.setEnd(end.node, end.offset);
	            };
	
	            WrappedTextRange.prototype.getName = function() {
	                return "WrappedTextRange";
	            };
	
	            DomRange.copyComparisonConstants(WrappedTextRange);
	
	            var rangeToTextRange = function(range) {
	                if (range.collapsed) {
	                    return createBoundaryTextRange(new DomPosition(range.startContainer, range.startOffset), true);
	                } else {
	                    var startRange = createBoundaryTextRange(new DomPosition(range.startContainer, range.startOffset), true);
	                    var endRange = createBoundaryTextRange(new DomPosition(range.endContainer, range.endOffset), false);
	                    var textRange = getBody( DomRange.getRangeDocument(range) ).createTextRange();
	                    textRange.setEndPoint("StartToStart", startRange);
	                    textRange.setEndPoint("EndToEnd", endRange);
	                    return textRange;
	                }
	            };
	
	            WrappedTextRange.rangeToTextRange = rangeToTextRange;
	
	            WrappedTextRange.prototype.toTextRange = function() {
	                return rangeToTextRange(this);
	            };
	
	            api.WrappedTextRange = WrappedTextRange;
	
	            // IE 9 and above have both implementations and Rangy makes both available. The next few lines sets which
	            // implementation to use by default.
	            if (!api.features.implementsDomRange || api.config.preferTextRange) {
	                // Add WrappedTextRange as the Range property of the global object to allow expression like Range.END_TO_END to work
	                var globalObj = (function(f) { return f("return this;")(); })(Function);
	                if (typeof globalObj.Range == "undefined") {
	                    globalObj.Range = WrappedTextRange;
	                }
	
	                api.createNativeRange = function(doc) {
	                    doc = getContentDocument(doc, module, "createNativeRange");
	                    return getBody(doc).createTextRange();
	                };
	
	                api.WrappedRange = WrappedTextRange;
	            }
	        }
	
	        api.createRange = function(doc) {
	            doc = getContentDocument(doc, module, "createRange");
	            return new api.WrappedRange(api.createNativeRange(doc));
	        };
	
	        api.createRangyRange = function(doc) {
	            doc = getContentDocument(doc, module, "createRangyRange");
	            return new DomRange(doc);
	        };
	
	        util.createAliasForDeprecatedMethod(api, "createIframeRange", "createRange");
	        util.createAliasForDeprecatedMethod(api, "createIframeRangyRange", "createRangyRange");
	
	        api.addShimListener(function(win) {
	            var doc = win.document;
	            if (typeof doc.createRange == "undefined") {
	                doc.createRange = function() {
	                    return api.createRange(doc);
	                };
	            }
	            doc = win = null;
	        });
	    });
	
	    /*----------------------------------------------------------------------------------------------------------------*/
	
	    // This module creates a selection object wrapper that conforms as closely as possible to the Selection specification
	    // in the HTML Editing spec (http://dvcs.w3.org/hg/editing/raw-file/tip/editing.html#selections)
	    api.createCoreModule("WrappedSelection", ["DomRange", "WrappedRange"], function(api, module) {
	        api.config.checkSelectionRanges = true;
	
	        var BOOLEAN = "boolean";
	        var NUMBER = "number";
	        var dom = api.dom;
	        var util = api.util;
	        var isHostMethod = util.isHostMethod;
	        var DomRange = api.DomRange;
	        var WrappedRange = api.WrappedRange;
	        var DOMException = api.DOMException;
	        var DomPosition = dom.DomPosition;
	        var getNativeSelection;
	        var selectionIsCollapsed;
	        var features = api.features;
	        var CONTROL = "Control";
	        var getDocument = dom.getDocument;
	        var getBody = dom.getBody;
	        var rangesEqual = DomRange.rangesEqual;
	
	
	        // Utility function to support direction parameters in the API that may be a string ("backward", "backwards",
	        // "forward" or "forwards") or a Boolean (true for backwards).
	        function isDirectionBackward(dir) {
	            return (typeof dir == "string") ? /^backward(s)?$/i.test(dir) : !!dir;
	        }
	
	        function getWindow(win, methodName) {
	            if (!win) {
	                return window;
	            } else if (dom.isWindow(win)) {
	                return win;
	            } else if (win instanceof WrappedSelection) {
	                return win.win;
	            } else {
	                var doc = dom.getContentDocument(win, module, methodName);
	                return dom.getWindow(doc);
	            }
	        }
	
	        function getWinSelection(winParam) {
	            return getWindow(winParam, "getWinSelection").getSelection();
	        }
	
	        function getDocSelection(winParam) {
	            return getWindow(winParam, "getDocSelection").document.selection;
	        }
	
	        function winSelectionIsBackward(sel) {
	            var backward = false;
	            if (sel.anchorNode) {
	                backward = (dom.comparePoints(sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset) == 1);
	            }
	            return backward;
	        }
	
	        // Test for the Range/TextRange and Selection features required
	        // Test for ability to retrieve selection
	        var implementsWinGetSelection = isHostMethod(window, "getSelection"),
	            implementsDocSelection = util.isHostObject(document, "selection");
	
	        features.implementsWinGetSelection = implementsWinGetSelection;
	        features.implementsDocSelection = implementsDocSelection;
	
	        var useDocumentSelection = implementsDocSelection && (!implementsWinGetSelection || api.config.preferTextRange);
	
	        if (useDocumentSelection) {
	            getNativeSelection = getDocSelection;
	            api.isSelectionValid = function(winParam) {
	                var doc = getWindow(winParam, "isSelectionValid").document, nativeSel = doc.selection;
	
	                // Check whether the selection TextRange is actually contained within the correct document
	                return (nativeSel.type != "None" || getDocument(nativeSel.createRange().parentElement()) == doc);
	            };
	        } else if (implementsWinGetSelection) {
	            getNativeSelection = getWinSelection;
	            api.isSelectionValid = function() {
	                return true;
	            };
	        } else {
	            module.fail("Neither document.selection or window.getSelection() detected.");
	            return false;
	        }
	
	        api.getNativeSelection = getNativeSelection;
	
	        var testSelection = getNativeSelection();
	
	        // In Firefox, the selection is null in an iframe with display: none. See issue #138.
	        if (!testSelection) {
	            module.fail("Native selection was null (possibly issue 138?)");
	            return false;
	        }
	
	        var testRange = api.createNativeRange(document);
	        var body = getBody(document);
	
	        // Obtaining a range from a selection
	        var selectionHasAnchorAndFocus = util.areHostProperties(testSelection,
	            ["anchorNode", "focusNode", "anchorOffset", "focusOffset"]);
	
	        features.selectionHasAnchorAndFocus = selectionHasAnchorAndFocus;
	
	        // Test for existence of native selection extend() method
	        var selectionHasExtend = isHostMethod(testSelection, "extend");
	        features.selectionHasExtend = selectionHasExtend;
	
	        // Test if rangeCount exists
	        var selectionHasRangeCount = (typeof testSelection.rangeCount == NUMBER);
	        features.selectionHasRangeCount = selectionHasRangeCount;
	
	        var selectionSupportsMultipleRanges = false;
	        var collapsedNonEditableSelectionsSupported = true;
	
	        var addRangeBackwardToNative = selectionHasExtend ?
	            function(nativeSelection, range) {
	                var doc = DomRange.getRangeDocument(range);
	                var endRange = api.createRange(doc);
	                endRange.collapseToPoint(range.endContainer, range.endOffset);
	                nativeSelection.addRange(getNativeRange(endRange));
	                nativeSelection.extend(range.startContainer, range.startOffset);
	            } : null;
	
	        if (util.areHostMethods(testSelection, ["addRange", "getRangeAt", "removeAllRanges"]) &&
	                typeof testSelection.rangeCount == NUMBER && features.implementsDomRange) {
	
	            (function() {
	                // Previously an iframe was used but this caused problems in some circumstances in IE, so tests are
	                // performed on the current document's selection. See issue 109.
	
	                // Note also that if a selection previously existed, it is wiped and later restored by these tests. This
	                // will result in the selection direction begin reversed if the original selection was backwards and the
	                // browser does not support setting backwards selections (Internet Explorer, I'm looking at you).
	                var sel = window.getSelection();
	                if (sel) {
	                    // Store the current selection
	                    var originalSelectionRangeCount = sel.rangeCount;
	                    var selectionHasMultipleRanges = (originalSelectionRangeCount > 1);
	                    var originalSelectionRanges = [];
	                    var originalSelectionBackward = winSelectionIsBackward(sel);
	                    for (var i = 0; i < originalSelectionRangeCount; ++i) {
	                        originalSelectionRanges[i] = sel.getRangeAt(i);
	                    }
	
	                    // Create some test elements
	                    var testEl = dom.createTestElement(document, "", false);
	                    var textNode = testEl.appendChild( document.createTextNode("\u00a0\u00a0\u00a0") );
	
	                    // Test whether the native selection will allow a collapsed selection within a non-editable element
	                    var r1 = document.createRange();
	
	                    r1.setStart(textNode, 1);
	                    r1.collapse(true);
	                    sel.removeAllRanges();
	                    sel.addRange(r1);
	                    collapsedNonEditableSelectionsSupported = (sel.rangeCount == 1);
	                    sel.removeAllRanges();
	
	                    // Test whether the native selection is capable of supporting multiple ranges.
	                    if (!selectionHasMultipleRanges) {
	                        // Doing the original feature test here in Chrome 36 (and presumably later versions) prints a
	                        // console error of "Discontiguous selection is not supported." that cannot be suppressed. There's
	                        // nothing we can do about this while retaining the feature test so we have to resort to a browser
	                        // sniff. I'm not happy about it. See
	                        // https://code.google.com/p/chromium/issues/detail?id=399791
	                        var chromeMatch = window.navigator.appVersion.match(/Chrome\/(.*?) /);
	                        if (chromeMatch && parseInt(chromeMatch[1]) >= 36) {
	                            selectionSupportsMultipleRanges = false;
	                        } else {
	                            var r2 = r1.cloneRange();
	                            r1.setStart(textNode, 0);
	                            r2.setEnd(textNode, 3);
	                            r2.setStart(textNode, 2);
	                            sel.addRange(r1);
	                            sel.addRange(r2);
	                            selectionSupportsMultipleRanges = (sel.rangeCount == 2);
	                        }
	                    }
	
	                    // Clean up
	                    dom.removeNode(testEl);
	                    sel.removeAllRanges();
	
	                    for (i = 0; i < originalSelectionRangeCount; ++i) {
	                        if (i == 0 && originalSelectionBackward) {
	                            if (addRangeBackwardToNative) {
	                                addRangeBackwardToNative(sel, originalSelectionRanges[i]);
	                            } else {
	                                api.warn("Rangy initialization: original selection was backwards but selection has been restored forwards because the browser does not support Selection.extend");
	                                sel.addRange(originalSelectionRanges[i]);
	                            }
	                        } else {
	                            sel.addRange(originalSelectionRanges[i]);
	                        }
	                    }
	                }
	            })();
	        }
	
	        features.selectionSupportsMultipleRanges = selectionSupportsMultipleRanges;
	        features.collapsedNonEditableSelectionsSupported = collapsedNonEditableSelectionsSupported;
	
	        // ControlRanges
	        var implementsControlRange = false, testControlRange;
	
	        if (body && isHostMethod(body, "createControlRange")) {
	            testControlRange = body.createControlRange();
	            if (util.areHostProperties(testControlRange, ["item", "add"])) {
	                implementsControlRange = true;
	            }
	        }
	        features.implementsControlRange = implementsControlRange;
	
	        // Selection collapsedness
	        if (selectionHasAnchorAndFocus) {
	            selectionIsCollapsed = function(sel) {
	                return sel.anchorNode === sel.focusNode && sel.anchorOffset === sel.focusOffset;
	            };
	        } else {
	            selectionIsCollapsed = function(sel) {
	                return sel.rangeCount ? sel.getRangeAt(sel.rangeCount - 1).collapsed : false;
	            };
	        }
	
	        function updateAnchorAndFocusFromRange(sel, range, backward) {
	            var anchorPrefix = backward ? "end" : "start", focusPrefix = backward ? "start" : "end";
	            sel.anchorNode = range[anchorPrefix + "Container"];
	            sel.anchorOffset = range[anchorPrefix + "Offset"];
	            sel.focusNode = range[focusPrefix + "Container"];
	            sel.focusOffset = range[focusPrefix + "Offset"];
	        }
	
	        function updateAnchorAndFocusFromNativeSelection(sel) {
	            var nativeSel = sel.nativeSelection;
	            sel.anchorNode = nativeSel.anchorNode;
	            sel.anchorOffset = nativeSel.anchorOffset;
	            sel.focusNode = nativeSel.focusNode;
	            sel.focusOffset = nativeSel.focusOffset;
	        }
	
	        function updateEmptySelection(sel) {
	            sel.anchorNode = sel.focusNode = null;
	            sel.anchorOffset = sel.focusOffset = 0;
	            sel.rangeCount = 0;
	            sel.isCollapsed = true;
	            sel._ranges.length = 0;
	        }
	
	        function getNativeRange(range) {
	            var nativeRange;
	            if (range instanceof DomRange) {
	                nativeRange = api.createNativeRange(range.getDocument());
	                nativeRange.setEnd(range.endContainer, range.endOffset);
	                nativeRange.setStart(range.startContainer, range.startOffset);
	            } else if (range instanceof WrappedRange) {
	                nativeRange = range.nativeRange;
	            } else if (features.implementsDomRange && (range instanceof dom.getWindow(range.startContainer).Range)) {
	                nativeRange = range;
	            }
	            return nativeRange;
	        }
	
	        function rangeContainsSingleElement(rangeNodes) {
	            if (!rangeNodes.length || rangeNodes[0].nodeType != 1) {
	                return false;
	            }
	            for (var i = 1, len = rangeNodes.length; i < len; ++i) {
	                if (!dom.isAncestorOf(rangeNodes[0], rangeNodes[i])) {
	                    return false;
	                }
	            }
	            return true;
	        }
	
	        function getSingleElementFromRange(range) {
	            var nodes = range.getNodes();
	            if (!rangeContainsSingleElement(nodes)) {
	                throw module.createError("getSingleElementFromRange: range " + range.inspect() + " did not consist of a single element");
	            }
	            return nodes[0];
	        }
	
	        // Simple, quick test which only needs to distinguish between a TextRange and a ControlRange
	        function isTextRange(range) {
	            return !!range && typeof range.text != "undefined";
	        }
	
	        function updateFromTextRange(sel, range) {
	            // Create a Range from the selected TextRange
	            var wrappedRange = new WrappedRange(range);
	            sel._ranges = [wrappedRange];
	
	            updateAnchorAndFocusFromRange(sel, wrappedRange, false);
	            sel.rangeCount = 1;
	            sel.isCollapsed = wrappedRange.collapsed;
	        }
	
	        function updateControlSelection(sel) {
	            // Update the wrapped selection based on what's now in the native selection
	            sel._ranges.length = 0;
	            if (sel.docSelection.type == "None") {
	                updateEmptySelection(sel);
	            } else {
	                var controlRange = sel.docSelection.createRange();
	                if (isTextRange(controlRange)) {
	                    // This case (where the selection type is "Control" and calling createRange() on the selection returns
	                    // a TextRange) can happen in IE 9. It happens, for example, when all elements in the selected
	                    // ControlRange have been removed from the ControlRange and removed from the document.
	                    updateFromTextRange(sel, controlRange);
	                } else {
	                    sel.rangeCount = controlRange.length;
	                    var range, doc = getDocument(controlRange.item(0));
	                    for (var i = 0; i < sel.rangeCount; ++i) {
	                        range = api.createRange(doc);
	                        range.selectNode(controlRange.item(i));
	                        sel._ranges.push(range);
	                    }
	                    sel.isCollapsed = sel.rangeCount == 1 && sel._ranges[0].collapsed;
	                    updateAnchorAndFocusFromRange(sel, sel._ranges[sel.rangeCount - 1], false);
	                }
	            }
	        }
	
	        function addRangeToControlSelection(sel, range) {
	            var controlRange = sel.docSelection.createRange();
	            var rangeElement = getSingleElementFromRange(range);
	
	            // Create a new ControlRange containing all the elements in the selected ControlRange plus the element
	            // contained by the supplied range
	            var doc = getDocument(controlRange.item(0));
	            var newControlRange = getBody(doc).createControlRange();
	            for (var i = 0, len = controlRange.length; i < len; ++i) {
	                newControlRange.add(controlRange.item(i));
	            }
	            try {
	                newControlRange.add(rangeElement);
	            } catch (ex) {
	                throw module.createError("addRange(): Element within the specified Range could not be added to control selection (does it have layout?)");
	            }
	            newControlRange.select();
	
	            // Update the wrapped selection based on what's now in the native selection
	            updateControlSelection(sel);
	        }
	
	        var getSelectionRangeAt;
	
	        if (isHostMethod(testSelection, "getRangeAt")) {
	            // try/catch is present because getRangeAt() must have thrown an error in some browser and some situation.
	            // Unfortunately, I didn't write a comment about the specifics and am now scared to take it out. Let that be a
	            // lesson to us all, especially me.
	            getSelectionRangeAt = function(sel, index) {
	                try {
	                    return sel.getRangeAt(index);
	                } catch (ex) {
	                    return null;
	                }
	            };
	        } else if (selectionHasAnchorAndFocus) {
	            getSelectionRangeAt = function(sel) {
	                var doc = getDocument(sel.anchorNode);
	                var range = api.createRange(doc);
	                range.setStartAndEnd(sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset);
	
	                // Handle the case when the selection was selected backwards (from the end to the start in the
	                // document)
	                if (range.collapsed !== this.isCollapsed) {
	                    range.setStartAndEnd(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset);
	                }
	
	                return range;
	            };
	        }
	
	        function WrappedSelection(selection, docSelection, win) {
	            this.nativeSelection = selection;
	            this.docSelection = docSelection;
	            this._ranges = [];
	            this.win = win;
	            this.refresh();
	        }
	
	        WrappedSelection.prototype = api.selectionPrototype;
	
	        function deleteProperties(sel) {
	            sel.win = sel.anchorNode = sel.focusNode = sel._ranges = null;
	            sel.rangeCount = sel.anchorOffset = sel.focusOffset = 0;
	            sel.detached = true;
	        }
	
	        var cachedRangySelections = [];
	
	        function actOnCachedSelection(win, action) {
	            var i = cachedRangySelections.length, cached, sel;
	            while (i--) {
	                cached = cachedRangySelections[i];
	                sel = cached.selection;
	                if (action == "deleteAll") {
	                    deleteProperties(sel);
	                } else if (cached.win == win) {
	                    if (action == "delete") {
	                        cachedRangySelections.splice(i, 1);
	                        return true;
	                    } else {
	                        return sel;
	                    }
	                }
	            }
	            if (action == "deleteAll") {
	                cachedRangySelections.length = 0;
	            }
	            return null;
	        }
	
	        var getSelection = function(win) {
	            // Check if the parameter is a Rangy Selection object
	            if (win && win instanceof WrappedSelection) {
	                win.refresh();
	                return win;
	            }
	
	            win = getWindow(win, "getNativeSelection");
	
	            var sel = actOnCachedSelection(win);
	            var nativeSel = getNativeSelection(win), docSel = implementsDocSelection ? getDocSelection(win) : null;
	            if (sel) {
	                sel.nativeSelection = nativeSel;
	                sel.docSelection = docSel;
	                sel.refresh();
	            } else {
	                sel = new WrappedSelection(nativeSel, docSel, win);
	                cachedRangySelections.push( { win: win, selection: sel } );
	            }
	            return sel;
	        };
	
	        api.getSelection = getSelection;
	
	        util.createAliasForDeprecatedMethod(api, "getIframeSelection", "getSelection");
	
	        var selProto = WrappedSelection.prototype;
	
	        function createControlSelection(sel, ranges) {
	            // Ensure that the selection becomes of type "Control"
	            var doc = getDocument(ranges[0].startContainer);
	            var controlRange = getBody(doc).createControlRange();
	            for (var i = 0, el, len = ranges.length; i < len; ++i) {
	                el = getSingleElementFromRange(ranges[i]);
	                try {
	                    controlRange.add(el);
	                } catch (ex) {
	                    throw module.createError("setRanges(): Element within one of the specified Ranges could not be added to control selection (does it have layout?)");
	                }
	            }
	            controlRange.select();
	
	            // Update the wrapped selection based on what's now in the native selection
	            updateControlSelection(sel);
	        }
	
	        // Selecting a range
	        if (!useDocumentSelection && selectionHasAnchorAndFocus && util.areHostMethods(testSelection, ["removeAllRanges", "addRange"])) {
	            selProto.removeAllRanges = function() {
	                this.nativeSelection.removeAllRanges();
	                updateEmptySelection(this);
	            };
	
	            var addRangeBackward = function(sel, range) {
	                addRangeBackwardToNative(sel.nativeSelection, range);
	                sel.refresh();
	            };
	
	            if (selectionHasRangeCount) {
	                selProto.addRange = function(range, direction) {
	                    if (implementsControlRange && implementsDocSelection && this.docSelection.type == CONTROL) {
	                        addRangeToControlSelection(this, range);
	                    } else {
	                        if (isDirectionBackward(direction) && selectionHasExtend) {
	                            addRangeBackward(this, range);
	                        } else {
	                            var previousRangeCount;
	                            if (selectionSupportsMultipleRanges) {
	                                previousRangeCount = this.rangeCount;
	                            } else {
	                                this.removeAllRanges();
	                                previousRangeCount = 0;
	                            }
	                            // Clone the native range so that changing the selected range does not affect the selection.
	                            // This is contrary to the spec but is the only way to achieve consistency between browsers. See
	                            // issue 80.
	                            var clonedNativeRange = getNativeRange(range).cloneRange();
	                            try {
	                                this.nativeSelection.addRange(clonedNativeRange);
	                            } catch (ex) {
	                            }
	
	                            // Check whether adding the range was successful
	                            this.rangeCount = this.nativeSelection.rangeCount;
	
	                            if (this.rangeCount == previousRangeCount + 1) {
	                                // The range was added successfully
	
	                                // Check whether the range that we added to the selection is reflected in the last range extracted from
	                                // the selection
	                                if (api.config.checkSelectionRanges) {
	                                    var nativeRange = getSelectionRangeAt(this.nativeSelection, this.rangeCount - 1);
	                                    if (nativeRange && !rangesEqual(nativeRange, range)) {
	                                        // Happens in WebKit with, for example, a selection placed at the start of a text node
	                                        range = new WrappedRange(nativeRange);
	                                    }
	                                }
	                                this._ranges[this.rangeCount - 1] = range;
	                                updateAnchorAndFocusFromRange(this, range, selectionIsBackward(this.nativeSelection));
	                                this.isCollapsed = selectionIsCollapsed(this);
	                            } else {
	                                // The range was not added successfully. The simplest thing is to refresh
	                                this.refresh();
	                            }
	                        }
	                    }
	                };
	            } else {
	                selProto.addRange = function(range, direction) {
	                    if (isDirectionBackward(direction) && selectionHasExtend) {
	                        addRangeBackward(this, range);
	                    } else {
	                        this.nativeSelection.addRange(getNativeRange(range));
	                        this.refresh();
	                    }
	                };
	            }
	
	            selProto.setRanges = function(ranges) {
	                if (implementsControlRange && implementsDocSelection && ranges.length > 1) {
	                    createControlSelection(this, ranges);
	                } else {
	                    this.removeAllRanges();
	                    for (var i = 0, len = ranges.length; i < len; ++i) {
	                        this.addRange(ranges[i]);
	                    }
	                }
	            };
	        } else if (isHostMethod(testSelection, "empty") && isHostMethod(testRange, "select") &&
	                   implementsControlRange && useDocumentSelection) {
	
	            selProto.removeAllRanges = function() {
	                // Added try/catch as fix for issue #21
	                try {
	                    this.docSelection.empty();
	
	                    // Check for empty() not working (issue #24)
	                    if (this.docSelection.type != "None") {
	                        // Work around failure to empty a control selection by instead selecting a TextRange and then
	                        // calling empty()
	                        var doc;
	                        if (this.anchorNode) {
	                            doc = getDocument(this.anchorNode);
	                        } else if (this.docSelection.type == CONTROL) {
	                            var controlRange = this.docSelection.createRange();
	                            if (controlRange.length) {
	                                doc = getDocument( controlRange.item(0) );
	                            }
	                        }
	                        if (doc) {
	                            var textRange = getBody(doc).createTextRange();
	                            textRange.select();
	                            this.docSelection.empty();
	                        }
	                    }
	                } catch(ex) {}
	                updateEmptySelection(this);
	            };
	
	            selProto.addRange = function(range) {
	                if (this.docSelection.type == CONTROL) {
	                    addRangeToControlSelection(this, range);
	                } else {
	                    api.WrappedTextRange.rangeToTextRange(range).select();
	                    this._ranges[0] = range;
	                    this.rangeCount = 1;
	                    this.isCollapsed = this._ranges[0].collapsed;
	                    updateAnchorAndFocusFromRange(this, range, false);
	                }
	            };
	
	            selProto.setRanges = function(ranges) {
	                this.removeAllRanges();
	                var rangeCount = ranges.length;
	                if (rangeCount > 1) {
	                    createControlSelection(this, ranges);
	                } else if (rangeCount) {
	                    this.addRange(ranges[0]);
	                }
	            };
	        } else {
	            module.fail("No means of selecting a Range or TextRange was found");
	            return false;
	        }
	
	        selProto.getRangeAt = function(index) {
	            if (index < 0 || index >= this.rangeCount) {
	                throw new DOMException("INDEX_SIZE_ERR");
	            } else {
	                // Clone the range to preserve selection-range independence. See issue 80.
	                return this._ranges[index].cloneRange();
	            }
	        };
	
	        var refreshSelection;
	
	        if (useDocumentSelection) {
	            refreshSelection = function(sel) {
	                var range;
	                if (api.isSelectionValid(sel.win)) {
	                    range = sel.docSelection.createRange();
	                } else {
	                    range = getBody(sel.win.document).createTextRange();
	                    range.collapse(true);
	                }
	
	                if (sel.docSelection.type == CONTROL) {
	                    updateControlSelection(sel);
	                } else if (isTextRange(range)) {
	                    updateFromTextRange(sel, range);
	                } else {
	                    updateEmptySelection(sel);
	                }
	            };
	        } else if (isHostMethod(testSelection, "getRangeAt") && typeof testSelection.rangeCount == NUMBER) {
	            refreshSelection = function(sel) {
	                if (implementsControlRange && implementsDocSelection && sel.docSelection.type == CONTROL) {
	                    updateControlSelection(sel);
	                } else {
	                    sel._ranges.length = sel.rangeCount = sel.nativeSelection.rangeCount;
	                    if (sel.rangeCount) {
	                        for (var i = 0, len = sel.rangeCount; i < len; ++i) {
	                            sel._ranges[i] = new api.WrappedRange(sel.nativeSelection.getRangeAt(i));
	                        }
	                        updateAnchorAndFocusFromRange(sel, sel._ranges[sel.rangeCount - 1], selectionIsBackward(sel.nativeSelection));
	                        sel.isCollapsed = selectionIsCollapsed(sel);
	                    } else {
	                        updateEmptySelection(sel);
	                    }
	                }
	            };
	        } else if (selectionHasAnchorAndFocus && typeof testSelection.isCollapsed == BOOLEAN && typeof testRange.collapsed == BOOLEAN && features.implementsDomRange) {
	            refreshSelection = function(sel) {
	                var range, nativeSel = sel.nativeSelection;
	                if (nativeSel.anchorNode) {
	                    range = getSelectionRangeAt(nativeSel, 0);
	                    sel._ranges = [range];
	                    sel.rangeCount = 1;
	                    updateAnchorAndFocusFromNativeSelection(sel);
	                    sel.isCollapsed = selectionIsCollapsed(sel);
	                } else {
	                    updateEmptySelection(sel);
	                }
	            };
	        } else {
	            module.fail("No means of obtaining a Range or TextRange from the user's selection was found");
	            return false;
	        }
	
	        selProto.refresh = function(checkForChanges) {
	            var oldRanges = checkForChanges ? this._ranges.slice(0) : null;
	            var oldAnchorNode = this.anchorNode, oldAnchorOffset = this.anchorOffset;
	
	            refreshSelection(this);
	            if (checkForChanges) {
	                // Check the range count first
	                var i = oldRanges.length;
	                if (i != this._ranges.length) {
	                    return true;
	                }
	
	                // Now check the direction. Checking the anchor position is the same is enough since we're checking all the
	                // ranges after this
	                if (this.anchorNode != oldAnchorNode || this.anchorOffset != oldAnchorOffset) {
	                    return true;
	                }
	
	                // Finally, compare each range in turn
	                while (i--) {
	                    if (!rangesEqual(oldRanges[i], this._ranges[i])) {
	                        return true;
	                    }
	                }
	                return false;
	            }
	        };
	
	        // Removal of a single range
	        var removeRangeManually = function(sel, range) {
	            var ranges = sel.getAllRanges();
	            sel.removeAllRanges();
	            for (var i = 0, len = ranges.length; i < len; ++i) {
	                if (!rangesEqual(range, ranges[i])) {
	                    sel.addRange(ranges[i]);
	                }
	            }
	            if (!sel.rangeCount) {
	                updateEmptySelection(sel);
	            }
	        };
	
	        if (implementsControlRange && implementsDocSelection) {
	            selProto.removeRange = function(range) {
	                if (this.docSelection.type == CONTROL) {
	                    var controlRange = this.docSelection.createRange();
	                    var rangeElement = getSingleElementFromRange(range);
	
	                    // Create a new ControlRange containing all the elements in the selected ControlRange minus the
	                    // element contained by the supplied range
	                    var doc = getDocument(controlRange.item(0));
	                    var newControlRange = getBody(doc).createControlRange();
	                    var el, removed = false;
	                    for (var i = 0, len = controlRange.length; i < len; ++i) {
	                        el = controlRange.item(i);
	                        if (el !== rangeElement || removed) {
	                            newControlRange.add(controlRange.item(i));
	                        } else {
	                            removed = true;
	                        }
	                    }
	                    newControlRange.select();
	
	                    // Update the wrapped selection based on what's now in the native selection
	                    updateControlSelection(this);
	                } else {
	                    removeRangeManually(this, range);
	                }
	            };
	        } else {
	            selProto.removeRange = function(range) {
	                removeRangeManually(this, range);
	            };
	        }
	
	        // Detecting if a selection is backward
	        var selectionIsBackward;
	        if (!useDocumentSelection && selectionHasAnchorAndFocus && features.implementsDomRange) {
	            selectionIsBackward = winSelectionIsBackward;
	
	            selProto.isBackward = function() {
	                return selectionIsBackward(this);
	            };
	        } else {
	            selectionIsBackward = selProto.isBackward = function() {
	                return false;
	            };
	        }
	
	        // Create an alias for backwards compatibility. From 1.3, everything is "backward" rather than "backwards"
	        selProto.isBackwards = selProto.isBackward;
	
	        // Selection stringifier
	        // This is conformant to the old HTML5 selections draft spec but differs from WebKit and Mozilla's implementation.
	        // The current spec does not yet define this method.
	        selProto.toString = function() {
	            var rangeTexts = [];
	            for (var i = 0, len = this.rangeCount; i < len; ++i) {
	                rangeTexts[i] = "" + this._ranges[i];
	            }
	            return rangeTexts.join("");
	        };
	
	        function assertNodeInSameDocument(sel, node) {
	            if (sel.win.document != getDocument(node)) {
	                throw new DOMException("WRONG_DOCUMENT_ERR");
	            }
	        }
	
	        // No current browser conforms fully to the spec for this method, so Rangy's own method is always used
	        selProto.collapse = function(node, offset) {
	            assertNodeInSameDocument(this, node);
	            var range = api.createRange(node);
	            range.collapseToPoint(node, offset);
	            this.setSingleRange(range);
	            this.isCollapsed = true;
	        };
	
	        selProto.collapseToStart = function() {
	            if (this.rangeCount) {
	                var range = this._ranges[0];
	                this.collapse(range.startContainer, range.startOffset);
	            } else {
	                throw new DOMException("INVALID_STATE_ERR");
	            }
	        };
	
	        selProto.collapseToEnd = function() {
	            if (this.rangeCount) {
	                var range = this._ranges[this.rangeCount - 1];
	                this.collapse(range.endContainer, range.endOffset);
	            } else {
	                throw new DOMException("INVALID_STATE_ERR");
	            }
	        };
	
	        // The spec is very specific on how selectAllChildren should be implemented and not all browsers implement it as
	        // specified so the native implementation is never used by Rangy.
	        selProto.selectAllChildren = function(node) {
	            assertNodeInSameDocument(this, node);
	            var range = api.createRange(node);
	            range.selectNodeContents(node);
	            this.setSingleRange(range);
	        };
	
	        selProto.deleteFromDocument = function() {
	            // Sepcial behaviour required for IE's control selections
	            if (implementsControlRange && implementsDocSelection && this.docSelection.type == CONTROL) {
	                var controlRange = this.docSelection.createRange();
	                var element;
	                while (controlRange.length) {
	                    element = controlRange.item(0);
	                    controlRange.remove(element);
	                    dom.removeNode(element);
	                }
	                this.refresh();
	            } else if (this.rangeCount) {
	                var ranges = this.getAllRanges();
	                if (ranges.length) {
	                    this.removeAllRanges();
	                    for (var i = 0, len = ranges.length; i < len; ++i) {
	                        ranges[i].deleteContents();
	                    }
	                    // The spec says nothing about what the selection should contain after calling deleteContents on each
	                    // range. Firefox moves the selection to where the final selected range was, so we emulate that
	                    this.addRange(ranges[len - 1]);
	                }
	            }
	        };
	
	        // The following are non-standard extensions
	        selProto.eachRange = function(func, returnValue) {
	            for (var i = 0, len = this._ranges.length; i < len; ++i) {
	                if ( func( this.getRangeAt(i) ) ) {
	                    return returnValue;
	                }
	            }
	        };
	
	        selProto.getAllRanges = function() {
	            var ranges = [];
	            this.eachRange(function(range) {
	                ranges.push(range);
	            });
	            return ranges;
	        };
	
	        selProto.setSingleRange = function(range, direction) {
	            this.removeAllRanges();
	            this.addRange(range, direction);
	        };
	
	        selProto.callMethodOnEachRange = function(methodName, params) {
	            var results = [];
	            this.eachRange( function(range) {
	                results.push( range[methodName].apply(range, params || []) );
	            } );
	            return results;
	        };
	
	        function createStartOrEndSetter(isStart) {
	            return function(node, offset) {
	                var range;
	                if (this.rangeCount) {
	                    range = this.getRangeAt(0);
	                    range["set" + (isStart ? "Start" : "End")](node, offset);
	                } else {
	                    range = api.createRange(this.win.document);
	                    range.setStartAndEnd(node, offset);
	                }
	                this.setSingleRange(range, this.isBackward());
	            };
	        }
	
	        selProto.setStart = createStartOrEndSetter(true);
	        selProto.setEnd = createStartOrEndSetter(false);
	
	        // Add select() method to Range prototype. Any existing selection will be removed.
	        api.rangePrototype.select = function(direction) {
	            getSelection( this.getDocument() ).setSingleRange(this, direction);
	        };
	
	        selProto.changeEachRange = function(func) {
	            var ranges = [];
	            var backward = this.isBackward();
	
	            this.eachRange(function(range) {
	                func(range);
	                ranges.push(range);
	            });
	
	            this.removeAllRanges();
	            if (backward && ranges.length == 1) {
	                this.addRange(ranges[0], "backward");
	            } else {
	                this.setRanges(ranges);
	            }
	        };
	
	        selProto.containsNode = function(node, allowPartial) {
	            return this.eachRange( function(range) {
	                return range.containsNode(node, allowPartial);
	            }, true ) || false;
	        };
	
	        selProto.getBookmark = function(containerNode) {
	            return {
	                backward: this.isBackward(),
	                rangeBookmarks: this.callMethodOnEachRange("getBookmark", [containerNode])
	            };
	        };
	
	        selProto.moveToBookmark = function(bookmark) {
	            var selRanges = [];
	            for (var i = 0, rangeBookmark, range; rangeBookmark = bookmark.rangeBookmarks[i++]; ) {
	                range = api.createRange(this.win);
	                range.moveToBookmark(rangeBookmark);
	                selRanges.push(range);
	            }
	            if (bookmark.backward) {
	                this.setSingleRange(selRanges[0], "backward");
	            } else {
	                this.setRanges(selRanges);
	            }
	        };
	
	        selProto.saveRanges = function() {
	            return {
	                backward: this.isBackward(),
	                ranges: this.callMethodOnEachRange("cloneRange")
	            };
	        };
	
	        selProto.restoreRanges = function(selRanges) {
	            this.removeAllRanges();
	            for (var i = 0, range; range = selRanges.ranges[i]; ++i) {
	                this.addRange(range, (selRanges.backward && i == 0));
	            }
	        };
	
	        selProto.toHtml = function() {
	            var rangeHtmls = [];
	            this.eachRange(function(range) {
	                rangeHtmls.push( DomRange.toHtml(range) );
	            });
	            return rangeHtmls.join("");
	        };
	
	        if (features.implementsTextRange) {
	            selProto.getNativeTextRange = function() {
	                var sel, textRange;
	                if ( (sel = this.docSelection) ) {
	                    var range = sel.createRange();
	                    if (isTextRange(range)) {
	                        return range;
	                    } else {
	                        throw module.createError("getNativeTextRange: selection is a control selection");
	                    }
	                } else if (this.rangeCount > 0) {
	                    return api.WrappedTextRange.rangeToTextRange( this.getRangeAt(0) );
	                } else {
	                    throw module.createError("getNativeTextRange: selection contains no range");
	                }
	            };
	        }
	
	        function inspect(sel) {
	            var rangeInspects = [];
	            var anchor = new DomPosition(sel.anchorNode, sel.anchorOffset);
	            var focus = new DomPosition(sel.focusNode, sel.focusOffset);
	            var name = (typeof sel.getName == "function") ? sel.getName() : "Selection";
	
	            if (typeof sel.rangeCount != "undefined") {
	                for (var i = 0, len = sel.rangeCount; i < len; ++i) {
	                    rangeInspects[i] = DomRange.inspect(sel.getRangeAt(i));
	                }
	            }
	            return "[" + name + "(Ranges: " + rangeInspects.join(", ") +
	                    ")(anchor: " + anchor.inspect() + ", focus: " + focus.inspect() + "]";
	        }
	
	        selProto.getName = function() {
	            return "WrappedSelection";
	        };
	
	        selProto.inspect = function() {
	            return inspect(this);
	        };
	
	        selProto.detach = function() {
	            actOnCachedSelection(this.win, "delete");
	            deleteProperties(this);
	        };
	
	        WrappedSelection.detachAll = function() {
	            actOnCachedSelection(null, "deleteAll");
	        };
	
	        WrappedSelection.inspect = inspect;
	        WrappedSelection.isDirectionBackward = isDirectionBackward;
	
	        api.Selection = WrappedSelection;
	
	        api.selectionPrototype = selProto;
	
	        api.addShimListener(function(win) {
	            if (typeof win.getSelection == "undefined") {
	                win.getSelection = function() {
	                    return getSelection(win);
	                };
	            }
	            win = null;
	        });
	    });
	    
	
	    /*----------------------------------------------------------------------------------------------------------------*/
	
	    // Wait for document to load before initializing
	    var docReady = false;
	
	    var loadHandler = function(e) {
	        if (!docReady) {
	            docReady = true;
	            if (!api.initialized && api.config.autoInitialize) {
	                init();
	            }
	        }
	    };
	
	    if (isBrowser) {
	        // Test whether the document has already been loaded and initialize immediately if so
	        if (document.readyState == "complete") {
	            loadHandler();
	        } else {
	            if (isHostMethod(document, "addEventListener")) {
	                document.addEventListener("DOMContentLoaded", loadHandler, false);
	            }
	
	            // Add a fallback in case the DOMContentLoaded event isn't supported
	            addListener(window, "load", loadHandler);
	        }
	    }
	
	    return api;
	}, this);

/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Class Applier module for Rangy.
	 * Adds, removes and toggles classes on Ranges and Selections
	 *
	 * Part of Rangy, a cross-browser JavaScript range and selection library
	 * https://github.com/timdown/rangy
	 *
	 * Depends on Rangy core.
	 *
	 * Copyright 2015, Tim Down
	 * Licensed under the MIT license.
	 * Version: 1.3.0
	 * Build date: 10 May 2015
	 */
	(function(factory, root) {
	    if (true) {
	        // AMD. Register as an anonymous module with a dependency on Rangy.
	        !(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(17)], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    } else if (typeof module != "undefined" && typeof exports == "object") {
	        // Node/CommonJS style
	        module.exports = factory( require("rangy") );
	    } else {
	        // No AMD or CommonJS support so we use the rangy property of root (probably the global variable)
	        factory(root.rangy);
	    }
	})(function(rangy) {
	    rangy.createModule("ClassApplier", ["WrappedSelection"], function(api, module) {
	        var dom = api.dom;
	        var DomPosition = dom.DomPosition;
	        var contains = dom.arrayContains;
	        var util = api.util;
	        var forEach = util.forEach;
	
	
	        var defaultTagName = "span";
	        var createElementNSSupported = util.isHostMethod(document, "createElementNS");
	
	        function each(obj, func) {
	            for (var i in obj) {
	                if (obj.hasOwnProperty(i)) {
	                    if (func(i, obj[i]) === false) {
	                        return false;
	                    }
	                }
	            }
	            return true;
	        }
	
	        function trim(str) {
	            return str.replace(/^\s\s*/, "").replace(/\s\s*$/, "");
	        }
	
	        function classNameContainsClass(fullClassName, className) {
	            return !!fullClassName && new RegExp("(?:^|\\s)" + className + "(?:\\s|$)").test(fullClassName);
	        }
	
	        // Inefficient, inelegant nonsense for IE's svg element, which has no classList and non-HTML className implementation
	        function hasClass(el, className) {
	            if (typeof el.classList == "object") {
	                return el.classList.contains(className);
	            } else {
	                var classNameSupported = (typeof el.className == "string");
	                var elClass = classNameSupported ? el.className : el.getAttribute("class");
	                return classNameContainsClass(elClass, className);
	            }
	        }
	
	        function addClass(el, className) {
	            if (typeof el.classList == "object") {
	                el.classList.add(className);
	            } else {
	                var classNameSupported = (typeof el.className == "string");
	                var elClass = classNameSupported ? el.className : el.getAttribute("class");
	                if (elClass) {
	                    if (!classNameContainsClass(elClass, className)) {
	                        elClass += " " + className;
	                    }
	                } else {
	                    elClass = className;
	                }
	                if (classNameSupported) {
	                    el.className = elClass;
	                } else {
	                    el.setAttribute("class", elClass);
	                }
	            }
	        }
	
	        var removeClass = (function() {
	            function replacer(matched, whiteSpaceBefore, whiteSpaceAfter) {
	                return (whiteSpaceBefore && whiteSpaceAfter) ? " " : "";
	            }
	
	            return function(el, className) {
	                if (typeof el.classList == "object") {
	                    el.classList.remove(className);
	                } else {
	                    var classNameSupported = (typeof el.className == "string");
	                    var elClass = classNameSupported ? el.className : el.getAttribute("class");
	                    elClass = elClass.replace(new RegExp("(^|\\s)" + className + "(\\s|$)"), replacer);
	                    if (classNameSupported) {
	                        el.className = elClass;
	                    } else {
	                        el.setAttribute("class", elClass);
	                    }
	                }
	            };
	        })();
	
	        function getClass(el) {
	            var classNameSupported = (typeof el.className == "string");
	            return classNameSupported ? el.className : el.getAttribute("class");
	        }
	
	        function sortClassName(className) {
	            return className && className.split(/\s+/).sort().join(" ");
	        }
	
	        function getSortedClassName(el) {
	            return sortClassName( getClass(el) );
	        }
	
	        function haveSameClasses(el1, el2) {
	            return getSortedClassName(el1) == getSortedClassName(el2);
	        }
	
	        function hasAllClasses(el, className) {
	            var classes = className.split(/\s+/);
	            for (var i = 0, len = classes.length; i < len; ++i) {
	                if (!hasClass(el, trim(classes[i]))) {
	                    return false;
	                }
	            }
	            return true;
	        }
	
	        function canTextBeStyled(textNode) {
	            var parent = textNode.parentNode;
	            return (parent && parent.nodeType == 1 && !/^(textarea|style|script|select|iframe)$/i.test(parent.nodeName));
	        }
	
	        function movePosition(position, oldParent, oldIndex, newParent, newIndex) {
	            var posNode = position.node, posOffset = position.offset;
	            var newNode = posNode, newOffset = posOffset;
	
	            if (posNode == newParent && posOffset > newIndex) {
	                ++newOffset;
	            }
	
	            if (posNode == oldParent && (posOffset == oldIndex  || posOffset == oldIndex + 1)) {
	                newNode = newParent;
	                newOffset += newIndex - oldIndex;
	            }
	
	            if (posNode == oldParent && posOffset > oldIndex + 1) {
	                --newOffset;
	            }
	
	            position.node = newNode;
	            position.offset = newOffset;
	        }
	
	        function movePositionWhenRemovingNode(position, parentNode, index) {
	            if (position.node == parentNode && position.offset > index) {
	                --position.offset;
	            }
	        }
	
	        function movePreservingPositions(node, newParent, newIndex, positionsToPreserve) {
	            // For convenience, allow newIndex to be -1 to mean "insert at the end".
	            if (newIndex == -1) {
	                newIndex = newParent.childNodes.length;
	            }
	
	            var oldParent = node.parentNode;
	            var oldIndex = dom.getNodeIndex(node);
	
	            forEach(positionsToPreserve, function(position) {
	                movePosition(position, oldParent, oldIndex, newParent, newIndex);
	            });
	
	            // Now actually move the node.
	            if (newParent.childNodes.length == newIndex) {
	                newParent.appendChild(node);
	            } else {
	                newParent.insertBefore(node, newParent.childNodes[newIndex]);
	            }
	        }
	
	        function removePreservingPositions(node, positionsToPreserve) {
	
	            var oldParent = node.parentNode;
	            var oldIndex = dom.getNodeIndex(node);
	
	            forEach(positionsToPreserve, function(position) {
	                movePositionWhenRemovingNode(position, oldParent, oldIndex);
	            });
	
	            dom.removeNode(node);
	        }
	
	        function moveChildrenPreservingPositions(node, newParent, newIndex, removeNode, positionsToPreserve) {
	            var child, children = [];
	            while ( (child = node.firstChild) ) {
	                movePreservingPositions(child, newParent, newIndex++, positionsToPreserve);
	                children.push(child);
	            }
	            if (removeNode) {
	                removePreservingPositions(node, positionsToPreserve);
	            }
	            return children;
	        }
	
	        function replaceWithOwnChildrenPreservingPositions(element, positionsToPreserve) {
	            return moveChildrenPreservingPositions(element, element.parentNode, dom.getNodeIndex(element), true, positionsToPreserve);
	        }
	
	        function rangeSelectsAnyText(range, textNode) {
	            var textNodeRange = range.cloneRange();
	            textNodeRange.selectNodeContents(textNode);
	
	            var intersectionRange = textNodeRange.intersection(range);
	            var text = intersectionRange ? intersectionRange.toString() : "";
	
	            return text != "";
	        }
	
	        function getEffectiveTextNodes(range) {
	            var nodes = range.getNodes([3]);
	
	            // Optimization as per issue 145
	
	            // Remove non-intersecting text nodes from the start of the range
	            var start = 0, node;
	            while ( (node = nodes[start]) && !rangeSelectsAnyText(range, node) ) {
	                ++start;
	            }
	
	            // Remove non-intersecting text nodes from the start of the range
	            var end = nodes.length - 1;
	            while ( (node = nodes[end]) && !rangeSelectsAnyText(range, node) ) {
	                --end;
	            }
	
	            return nodes.slice(start, end + 1);
	        }
	
	        function elementsHaveSameNonClassAttributes(el1, el2) {
	            if (el1.attributes.length != el2.attributes.length) return false;
	            for (var i = 0, len = el1.attributes.length, attr1, attr2, name; i < len; ++i) {
	                attr1 = el1.attributes[i];
	                name = attr1.name;
	                if (name != "class") {
	                    attr2 = el2.attributes.getNamedItem(name);
	                    if ( (attr1 === null) != (attr2 === null) ) return false;
	                    if (attr1.specified != attr2.specified) return false;
	                    if (attr1.specified && attr1.nodeValue !== attr2.nodeValue) return false;
	                }
	            }
	            return true;
	        }
	
	        function elementHasNonClassAttributes(el, exceptions) {
	            for (var i = 0, len = el.attributes.length, attrName; i < len; ++i) {
	                attrName = el.attributes[i].name;
	                if ( !(exceptions && contains(exceptions, attrName)) && el.attributes[i].specified && attrName != "class") {
	                    return true;
	                }
	            }
	            return false;
	        }
	
	        var getComputedStyleProperty = dom.getComputedStyleProperty;
	        var isEditableElement = (function() {
	            var testEl = document.createElement("div");
	            return typeof testEl.isContentEditable == "boolean" ?
	                function (node) {
	                    return node && node.nodeType == 1 && node.isContentEditable;
	                } :
	                function (node) {
	                    if (!node || node.nodeType != 1 || node.contentEditable == "false") {
	                        return false;
	                    }
	                    return node.contentEditable == "true" || isEditableElement(node.parentNode);
	                };
	        })();
	
	        function isEditingHost(node) {
	            var parent;
	            return node && node.nodeType == 1 &&
	                (( (parent = node.parentNode) && parent.nodeType == 9 && parent.designMode == "on") ||
	                (isEditableElement(node) && !isEditableElement(node.parentNode)));
	        }
	
	        function isEditable(node) {
	            return (isEditableElement(node) || (node.nodeType != 1 && isEditableElement(node.parentNode))) && !isEditingHost(node);
	        }
	
	        var inlineDisplayRegex = /^inline(-block|-table)?$/i;
	
	        function isNonInlineElement(node) {
	            return node && node.nodeType == 1 && !inlineDisplayRegex.test(getComputedStyleProperty(node, "display"));
	        }
	
	        // White space characters as defined by HTML 4 (http://www.w3.org/TR/html401/struct/text.html)
	        var htmlNonWhiteSpaceRegex = /[^\r\n\t\f \u200B]/;
	
	        function isUnrenderedWhiteSpaceNode(node) {
	            if (node.data.length == 0) {
	                return true;
	            }
	            if (htmlNonWhiteSpaceRegex.test(node.data)) {
	                return false;
	            }
	            var cssWhiteSpace = getComputedStyleProperty(node.parentNode, "whiteSpace");
	            switch (cssWhiteSpace) {
	                case "pre":
	                case "pre-wrap":
	                case "-moz-pre-wrap":
	                    return false;
	                case "pre-line":
	                    if (/[\r\n]/.test(node.data)) {
	                        return false;
	                    }
	            }
	
	            // We now have a whitespace-only text node that may be rendered depending on its context. If it is adjacent to a
	            // non-inline element, it will not be rendered. This seems to be a good enough definition.
	            return isNonInlineElement(node.previousSibling) || isNonInlineElement(node.nextSibling);
	        }
	
	        function getRangeBoundaries(ranges) {
	            var positions = [], i, range;
	            for (i = 0; range = ranges[i++]; ) {
	                positions.push(
	                    new DomPosition(range.startContainer, range.startOffset),
	                    new DomPosition(range.endContainer, range.endOffset)
	                );
	            }
	            return positions;
	        }
	
	        function updateRangesFromBoundaries(ranges, positions) {
	            for (var i = 0, range, start, end, len = ranges.length; i < len; ++i) {
	                range = ranges[i];
	                start = positions[i * 2];
	                end = positions[i * 2 + 1];
	                range.setStartAndEnd(start.node, start.offset, end.node, end.offset);
	            }
	        }
	
	        function isSplitPoint(node, offset) {
	            if (dom.isCharacterDataNode(node)) {
	                if (offset == 0) {
	                    return !!node.previousSibling;
	                } else if (offset == node.length) {
	                    return !!node.nextSibling;
	                } else {
	                    return true;
	                }
	            }
	
	            return offset > 0 && offset < node.childNodes.length;
	        }
	
	        function splitNodeAt(node, descendantNode, descendantOffset, positionsToPreserve) {
	            var newNode, parentNode;
	            var splitAtStart = (descendantOffset == 0);
	
	            if (dom.isAncestorOf(descendantNode, node)) {
	                return node;
	            }
	
	            if (dom.isCharacterDataNode(descendantNode)) {
	                var descendantIndex = dom.getNodeIndex(descendantNode);
	                if (descendantOffset == 0) {
	                    descendantOffset = descendantIndex;
	                } else if (descendantOffset == descendantNode.length) {
	                    descendantOffset = descendantIndex + 1;
	                } else {
	                    throw module.createError("splitNodeAt() should not be called with offset in the middle of a data node (" +
	                        descendantOffset + " in " + descendantNode.data);
	                }
	                descendantNode = descendantNode.parentNode;
	            }
	
	            if (isSplitPoint(descendantNode, descendantOffset)) {
	                // descendantNode is now guaranteed not to be a text or other character node
	                newNode = descendantNode.cloneNode(false);
	                parentNode = descendantNode.parentNode;
	                if (newNode.id) {
	                    newNode.removeAttribute("id");
	                }
	                var child, newChildIndex = 0;
	
	                while ( (child = descendantNode.childNodes[descendantOffset]) ) {
	                    movePreservingPositions(child, newNode, newChildIndex++, positionsToPreserve);
	                }
	                movePreservingPositions(newNode, parentNode, dom.getNodeIndex(descendantNode) + 1, positionsToPreserve);
	                return (descendantNode == node) ? newNode : splitNodeAt(node, parentNode, dom.getNodeIndex(newNode), positionsToPreserve);
	            } else if (node != descendantNode) {
	                newNode = descendantNode.parentNode;
	
	                // Work out a new split point in the parent node
	                var newNodeIndex = dom.getNodeIndex(descendantNode);
	
	                if (!splitAtStart) {
	                    newNodeIndex++;
	                }
	                return splitNodeAt(node, newNode, newNodeIndex, positionsToPreserve);
	            }
	            return node;
	        }
	
	        function areElementsMergeable(el1, el2) {
	            return el1.namespaceURI == el2.namespaceURI &&
	                el1.tagName.toLowerCase() == el2.tagName.toLowerCase() &&
	                haveSameClasses(el1, el2) &&
	                elementsHaveSameNonClassAttributes(el1, el2) &&
	                getComputedStyleProperty(el1, "display") == "inline" &&
	                getComputedStyleProperty(el2, "display") == "inline";
	        }
	
	        function createAdjacentMergeableTextNodeGetter(forward) {
	            var siblingPropName = forward ? "nextSibling" : "previousSibling";
	
	            return function(textNode, checkParentElement) {
	                var el = textNode.parentNode;
	                var adjacentNode = textNode[siblingPropName];
	                if (adjacentNode) {
	                    // Can merge if the node's previous/next sibling is a text node
	                    if (adjacentNode && adjacentNode.nodeType == 3) {
	                        return adjacentNode;
	                    }
	                } else if (checkParentElement) {
	                    // Compare text node parent element with its sibling
	                    adjacentNode = el[siblingPropName];
	                    if (adjacentNode && adjacentNode.nodeType == 1 && areElementsMergeable(el, adjacentNode)) {
	                        var adjacentNodeChild = adjacentNode[forward ? "firstChild" : "lastChild"];
	                        if (adjacentNodeChild && adjacentNodeChild.nodeType == 3) {
	                            return adjacentNodeChild;
	                        }
	                    }
	                }
	                return null;
	            };
	        }
	
	        var getPreviousMergeableTextNode = createAdjacentMergeableTextNodeGetter(false),
	            getNextMergeableTextNode = createAdjacentMergeableTextNodeGetter(true);
	
	    
	        function Merge(firstNode) {
	            this.isElementMerge = (firstNode.nodeType == 1);
	            this.textNodes = [];
	            var firstTextNode = this.isElementMerge ? firstNode.lastChild : firstNode;
	            if (firstTextNode) {
	                this.textNodes[0] = firstTextNode;
	            }
	        }
	
	        Merge.prototype = {
	            doMerge: function(positionsToPreserve) {
	                var textNodes = this.textNodes;
	                var firstTextNode = textNodes[0];
	                if (textNodes.length > 1) {
	                    var firstTextNodeIndex = dom.getNodeIndex(firstTextNode);
	                    var textParts = [], combinedTextLength = 0, textNode, parent;
	                    forEach(textNodes, function(textNode, i) {
	                        parent = textNode.parentNode;
	                        if (i > 0) {
	                            parent.removeChild(textNode);
	                            if (!parent.hasChildNodes()) {
	                                dom.removeNode(parent);
	                            }
	                            if (positionsToPreserve) {
	                                forEach(positionsToPreserve, function(position) {
	                                    // Handle case where position is inside the text node being merged into a preceding node
	                                    if (position.node == textNode) {
	                                        position.node = firstTextNode;
	                                        position.offset += combinedTextLength;
	                                    }
	                                    // Handle case where both text nodes precede the position within the same parent node
	                                    if (position.node == parent && position.offset > firstTextNodeIndex) {
	                                        --position.offset;
	                                        if (position.offset == firstTextNodeIndex + 1 && i < len - 1) {
	                                            position.node = firstTextNode;
	                                            position.offset = combinedTextLength;
	                                        }
	                                    }
	                                });
	                            }
	                        }
	                        textParts[i] = textNode.data;
	                        combinedTextLength += textNode.data.length;
	                    });
	                    firstTextNode.data = textParts.join("");
	                }
	                return firstTextNode.data;
	            },
	
	            getLength: function() {
	                var i = this.textNodes.length, len = 0;
	                while (i--) {
	                    len += this.textNodes[i].length;
	                }
	                return len;
	            },
	
	            toString: function() {
	                var textParts = [];
	                forEach(this.textNodes, function(textNode, i) {
	                    textParts[i] = "'" + textNode.data + "'";
	                });
	                return "[Merge(" + textParts.join(",") + ")]";
	            }
	        };
	
	        var optionProperties = ["elementTagName", "ignoreWhiteSpace", "applyToEditableOnly", "useExistingElements",
	            "removeEmptyElements", "onElementCreate"];
	
	        // TODO: Populate this with every attribute name that corresponds to a property with a different name. Really??
	        var attrNamesForProperties = {};
	
	        function ClassApplier(className, options, tagNames) {
	            var normalize, i, len, propName, applier = this;
	            applier.cssClass = applier.className = className; // cssClass property is for backward compatibility
	
	            var elementPropertiesFromOptions = null, elementAttributes = {};
	
	            // Initialize from options object
	            if (typeof options == "object" && options !== null) {
	                if (typeof options.elementTagName !== "undefined") {
	                    options.elementTagName = options.elementTagName.toLowerCase();
	                }
	                tagNames = options.tagNames;
	                elementPropertiesFromOptions = options.elementProperties;
	                elementAttributes = options.elementAttributes;
	
	                for (i = 0; propName = optionProperties[i++]; ) {
	                    if (options.hasOwnProperty(propName)) {
	                        applier[propName] = options[propName];
	                    }
	                }
	                normalize = options.normalize;
	            } else {
	                normalize = options;
	            }
	
	            // Backward compatibility: the second parameter can also be a Boolean indicating to normalize after unapplying
	            applier.normalize = (typeof normalize == "undefined") ? true : normalize;
	
	            // Initialize element properties and attribute exceptions
	            applier.attrExceptions = [];
	            var el = document.createElement(applier.elementTagName);
	            applier.elementProperties = applier.copyPropertiesToElement(elementPropertiesFromOptions, el, true);
	            each(elementAttributes, function(attrName, attrValue) {
	                applier.attrExceptions.push(attrName);
	                // Ensure each attribute value is a string
	                elementAttributes[attrName] = "" + attrValue;
	            });
	            applier.elementAttributes = elementAttributes;
	
	            applier.elementSortedClassName = applier.elementProperties.hasOwnProperty("className") ?
	                sortClassName(applier.elementProperties.className + " " + className) : className;
	
	            // Initialize tag names
	            applier.applyToAnyTagName = false;
	            var type = typeof tagNames;
	            if (type == "string") {
	                if (tagNames == "*") {
	                    applier.applyToAnyTagName = true;
	                } else {
	                    applier.tagNames = trim(tagNames.toLowerCase()).split(/\s*,\s*/);
	                }
	            } else if (type == "object" && typeof tagNames.length == "number") {
	                applier.tagNames = [];
	                for (i = 0, len = tagNames.length; i < len; ++i) {
	                    if (tagNames[i] == "*") {
	                        applier.applyToAnyTagName = true;
	                    } else {
	                        applier.tagNames.push(tagNames[i].toLowerCase());
	                    }
	                }
	            } else {
	                applier.tagNames = [applier.elementTagName];
	            }
	        }
	
	        ClassApplier.prototype = {
	            elementTagName: defaultTagName,
	            elementProperties: {},
	            elementAttributes: {},
	            ignoreWhiteSpace: true,
	            applyToEditableOnly: false,
	            useExistingElements: true,
	            removeEmptyElements: true,
	            onElementCreate: null,
	
	            copyPropertiesToElement: function(props, el, createCopy) {
	                var s, elStyle, elProps = {}, elPropsStyle, propValue, elPropValue, attrName;
	
	                for (var p in props) {
	                    if (props.hasOwnProperty(p)) {
	                        propValue = props[p];
	                        elPropValue = el[p];
	
	                        // Special case for class. The copied properties object has the applier's class as well as its own
	                        // to simplify checks when removing styling elements
	                        if (p == "className") {
	                            addClass(el, propValue);
	                            addClass(el, this.className);
	                            el[p] = sortClassName(el[p]);
	                            if (createCopy) {
	                                elProps[p] = propValue;
	                            }
	                        }
	
	                        // Special case for style
	                        else if (p == "style") {
	                            elStyle = elPropValue;
	                            if (createCopy) {
	                                elProps[p] = elPropsStyle = {};
	                            }
	                            for (s in props[p]) {
	                                if (props[p].hasOwnProperty(s)) {
	                                    elStyle[s] = propValue[s];
	                                    if (createCopy) {
	                                        elPropsStyle[s] = elStyle[s];
	                                    }
	                                }
	                            }
	                            this.attrExceptions.push(p);
	                        } else {
	                            el[p] = propValue;
	                            // Copy the property back from the dummy element so that later comparisons to check whether
	                            // elements may be removed are checking against the right value. For example, the href property
	                            // of an element returns a fully qualified URL even if it was previously assigned a relative
	                            // URL.
	                            if (createCopy) {
	                                elProps[p] = el[p];
	
	                                // Not all properties map to identically-named attributes
	                                attrName = attrNamesForProperties.hasOwnProperty(p) ? attrNamesForProperties[p] : p;
	                                this.attrExceptions.push(attrName);
	                            }
	                        }
	                    }
	                }
	
	                return createCopy ? elProps : "";
	            },
	
	            copyAttributesToElement: function(attrs, el) {
	                for (var attrName in attrs) {
	                    if (attrs.hasOwnProperty(attrName) && !/^class(?:Name)?$/i.test(attrName)) {
	                        el.setAttribute(attrName, attrs[attrName]);
	                    }
	                }
	            },
	
	            appliesToElement: function(el) {
	                return contains(this.tagNames, el.tagName.toLowerCase());
	            },
	
	            getEmptyElements: function(range) {
	                var applier = this;
	                return range.getNodes([1], function(el) {
	                    return applier.appliesToElement(el) && !el.hasChildNodes();
	                });
	            },
	
	            hasClass: function(node) {
	                return node.nodeType == 1 &&
	                    (this.applyToAnyTagName || this.appliesToElement(node)) &&
	                    hasClass(node, this.className);
	            },
	
	            getSelfOrAncestorWithClass: function(node) {
	                while (node) {
	                    if (this.hasClass(node)) {
	                        return node;
	                    }
	                    node = node.parentNode;
	                }
	                return null;
	            },
	
	            isModifiable: function(node) {
	                return !this.applyToEditableOnly || isEditable(node);
	            },
	
	            // White space adjacent to an unwrappable node can be ignored for wrapping
	            isIgnorableWhiteSpaceNode: function(node) {
	                return this.ignoreWhiteSpace && node && node.nodeType == 3 && isUnrenderedWhiteSpaceNode(node);
	            },
	
	            // Normalizes nodes after applying a class to a Range.
	            postApply: function(textNodes, range, positionsToPreserve, isUndo) {
	                var firstNode = textNodes[0], lastNode = textNodes[textNodes.length - 1];
	
	                var merges = [], currentMerge;
	
	                var rangeStartNode = firstNode, rangeEndNode = lastNode;
	                var rangeStartOffset = 0, rangeEndOffset = lastNode.length;
	
	                var textNode, precedingTextNode;
	
	                // Check for every required merge and create a Merge object for each
	                forEach(textNodes, function(textNode) {
	                    precedingTextNode = getPreviousMergeableTextNode(textNode, !isUndo);
	                    if (precedingTextNode) {
	                        if (!currentMerge) {
	                            currentMerge = new Merge(precedingTextNode);
	                            merges.push(currentMerge);
	                        }
	                        currentMerge.textNodes.push(textNode);
	                        if (textNode === firstNode) {
	                            rangeStartNode = currentMerge.textNodes[0];
	                            rangeStartOffset = rangeStartNode.length;
	                        }
	                        if (textNode === lastNode) {
	                            rangeEndNode = currentMerge.textNodes[0];
	                            rangeEndOffset = currentMerge.getLength();
	                        }
	                    } else {
	                        currentMerge = null;
	                    }
	                });
	
	                // Test whether the first node after the range needs merging
	                var nextTextNode = getNextMergeableTextNode(lastNode, !isUndo);
	
	                if (nextTextNode) {
	                    if (!currentMerge) {
	                        currentMerge = new Merge(lastNode);
	                        merges.push(currentMerge);
	                    }
	                    currentMerge.textNodes.push(nextTextNode);
	                }
	
	                // Apply the merges
	                if (merges.length) {
	                    for (i = 0, len = merges.length; i < len; ++i) {
	                        merges[i].doMerge(positionsToPreserve);
	                    }
	
	                    // Set the range boundaries
	                    range.setStartAndEnd(rangeStartNode, rangeStartOffset, rangeEndNode, rangeEndOffset);
	                }
	            },
	
	            createContainer: function(parentNode) {
	                var doc = dom.getDocument(parentNode);
	                var namespace;
	                var el = createElementNSSupported && !dom.isHtmlNamespace(parentNode) && (namespace = parentNode.namespaceURI) ?
	                    doc.createElementNS(parentNode.namespaceURI, this.elementTagName) :
	                    doc.createElement(this.elementTagName);
	
	                this.copyPropertiesToElement(this.elementProperties, el, false);
	                this.copyAttributesToElement(this.elementAttributes, el);
	                addClass(el, this.className);
	                if (this.onElementCreate) {
	                    this.onElementCreate(el, this);
	                }
	                return el;
	            },
	
	            elementHasProperties: function(el, props) {
	                var applier = this;
	                return each(props, function(p, propValue) {
	                    if (p == "className") {
	                        // For checking whether we should reuse an existing element, we just want to check that the element
	                        // has all the classes specified in the className property. When deciding whether the element is
	                        // removable when unapplying a class, there is separate special handling to check whether the
	                        // element has extra classes so the same simple check will do.
	                        return hasAllClasses(el, propValue);
	                    } else if (typeof propValue == "object") {
	                        if (!applier.elementHasProperties(el[p], propValue)) {
	                            return false;
	                        }
	                    } else if (el[p] !== propValue) {
	                        return false;
	                    }
	                });
	            },
	
	            elementHasAttributes: function(el, attrs) {
	                return each(attrs, function(name, value) {
	                    if (el.getAttribute(name) !== value) {
	                        return false;
	                    }
	                });
	            },
	
	            applyToTextNode: function(textNode, positionsToPreserve) {
	
	                // Check whether the text node can be styled. Text within a <style> or <script> element, for example,
	                // should not be styled. See issue 283.
	                if (canTextBeStyled(textNode)) {
	                    var parent = textNode.parentNode;
	                    if (parent.childNodes.length == 1 &&
	                        this.useExistingElements &&
	                        this.appliesToElement(parent) &&
	                        this.elementHasProperties(parent, this.elementProperties) &&
	                        this.elementHasAttributes(parent, this.elementAttributes)) {
	
	                        addClass(parent, this.className);
	                    } else {
	                        var textNodeParent = textNode.parentNode;
	                        var el = this.createContainer(textNodeParent);
	                        textNodeParent.insertBefore(el, textNode);
	                        el.appendChild(textNode);
	                    }
	                }
	
	            },
	
	            isRemovable: function(el) {
	                return el.tagName.toLowerCase() == this.elementTagName &&
	                    getSortedClassName(el) == this.elementSortedClassName &&
	                    this.elementHasProperties(el, this.elementProperties) &&
	                    !elementHasNonClassAttributes(el, this.attrExceptions) &&
	                    this.elementHasAttributes(el, this.elementAttributes) &&
	                    this.isModifiable(el);
	            },
	
	            isEmptyContainer: function(el) {
	                var childNodeCount = el.childNodes.length;
	                return el.nodeType == 1 &&
	                    this.isRemovable(el) &&
	                    (childNodeCount == 0 || (childNodeCount == 1 && this.isEmptyContainer(el.firstChild)));
	            },
	
	            removeEmptyContainers: function(range) {
	                var applier = this;
	                var nodesToRemove = range.getNodes([1], function(el) {
	                    return applier.isEmptyContainer(el);
	                });
	
	                var rangesToPreserve = [range];
	                var positionsToPreserve = getRangeBoundaries(rangesToPreserve);
	
	                forEach(nodesToRemove, function(node) {
	                    removePreservingPositions(node, positionsToPreserve);
	                });
	
	                // Update the range from the preserved boundary positions
	                updateRangesFromBoundaries(rangesToPreserve, positionsToPreserve);
	            },
	
	            undoToTextNode: function(textNode, range, ancestorWithClass, positionsToPreserve) {
	                if (!range.containsNode(ancestorWithClass)) {
	                    // Split out the portion of the ancestor from which we can remove the class
	                    //var parent = ancestorWithClass.parentNode, index = dom.getNodeIndex(ancestorWithClass);
	                    var ancestorRange = range.cloneRange();
	                    ancestorRange.selectNode(ancestorWithClass);
	                    if (ancestorRange.isPointInRange(range.endContainer, range.endOffset)) {
	                        splitNodeAt(ancestorWithClass, range.endContainer, range.endOffset, positionsToPreserve);
	                        range.setEndAfter(ancestorWithClass);
	                    }
	                    if (ancestorRange.isPointInRange(range.startContainer, range.startOffset)) {
	                        ancestorWithClass = splitNodeAt(ancestorWithClass, range.startContainer, range.startOffset, positionsToPreserve);
	                    }
	                }
	
	                if (this.isRemovable(ancestorWithClass)) {
	                    replaceWithOwnChildrenPreservingPositions(ancestorWithClass, positionsToPreserve);
	                } else {
	                    removeClass(ancestorWithClass, this.className);
	                }
	            },
	
	            splitAncestorWithClass: function(container, offset, positionsToPreserve) {
	                var ancestorWithClass = this.getSelfOrAncestorWithClass(container);
	                if (ancestorWithClass) {
	                    splitNodeAt(ancestorWithClass, container, offset, positionsToPreserve);
	                }
	            },
	
	            undoToAncestor: function(ancestorWithClass, positionsToPreserve) {
	                if (this.isRemovable(ancestorWithClass)) {
	                    replaceWithOwnChildrenPreservingPositions(ancestorWithClass, positionsToPreserve);
	                } else {
	                    removeClass(ancestorWithClass, this.className);
	                }
	            },
	
	            applyToRange: function(range, rangesToPreserve) {
	                var applier = this;
	                rangesToPreserve = rangesToPreserve || [];
	
	                // Create an array of range boundaries to preserve
	                var positionsToPreserve = getRangeBoundaries(rangesToPreserve || []);
	
	                range.splitBoundariesPreservingPositions(positionsToPreserve);
	
	                // Tidy up the DOM by removing empty containers
	                if (applier.removeEmptyElements) {
	                    applier.removeEmptyContainers(range);
	                }
	
	                var textNodes = getEffectiveTextNodes(range);
	
	                if (textNodes.length) {
	                    forEach(textNodes, function(textNode) {
	                        if (!applier.isIgnorableWhiteSpaceNode(textNode) && !applier.getSelfOrAncestorWithClass(textNode) &&
	                                applier.isModifiable(textNode)) {
	                            applier.applyToTextNode(textNode, positionsToPreserve);
	                        }
	                    });
	                    var lastTextNode = textNodes[textNodes.length - 1];
	                    range.setStartAndEnd(textNodes[0], 0, lastTextNode, lastTextNode.length);
	                    if (applier.normalize) {
	                        applier.postApply(textNodes, range, positionsToPreserve, false);
	                    }
	
	                    // Update the ranges from the preserved boundary positions
	                    updateRangesFromBoundaries(rangesToPreserve, positionsToPreserve);
	                }
	
	                // Apply classes to any appropriate empty elements
	                var emptyElements = applier.getEmptyElements(range);
	
	                forEach(emptyElements, function(el) {
	                    addClass(el, applier.className);
	                });
	            },
	
	            applyToRanges: function(ranges) {
	
	                var i = ranges.length;
	                while (i--) {
	                    this.applyToRange(ranges[i], ranges);
	                }
	
	
	                return ranges;
	            },
	
	            applyToSelection: function(win) {
	                var sel = api.getSelection(win);
	                sel.setRanges( this.applyToRanges(sel.getAllRanges()) );
	            },
	
	            undoToRange: function(range, rangesToPreserve) {
	                var applier = this;
	                // Create an array of range boundaries to preserve
	                rangesToPreserve = rangesToPreserve || [];
	                var positionsToPreserve = getRangeBoundaries(rangesToPreserve);
	
	
	                range.splitBoundariesPreservingPositions(positionsToPreserve);
	
	                // Tidy up the DOM by removing empty containers
	                if (applier.removeEmptyElements) {
	                    applier.removeEmptyContainers(range, positionsToPreserve);
	                }
	
	                var textNodes = getEffectiveTextNodes(range);
	                var textNode, ancestorWithClass;
	                var lastTextNode = textNodes[textNodes.length - 1];
	
	                if (textNodes.length) {
	                    applier.splitAncestorWithClass(range.endContainer, range.endOffset, positionsToPreserve);
	                    applier.splitAncestorWithClass(range.startContainer, range.startOffset, positionsToPreserve);
	                    for (var i = 0, len = textNodes.length; i < len; ++i) {
	                        textNode = textNodes[i];
	                        ancestorWithClass = applier.getSelfOrAncestorWithClass(textNode);
	                        if (ancestorWithClass && applier.isModifiable(textNode)) {
	                            applier.undoToAncestor(ancestorWithClass, positionsToPreserve);
	                        }
	                    }
	                    // Ensure the range is still valid
	                    range.setStartAndEnd(textNodes[0], 0, lastTextNode, lastTextNode.length);
	
	
	                    if (applier.normalize) {
	                        applier.postApply(textNodes, range, positionsToPreserve, true);
	                    }
	
	                    // Update the ranges from the preserved boundary positions
	                    updateRangesFromBoundaries(rangesToPreserve, positionsToPreserve);
	                }
	
	                // Remove class from any appropriate empty elements
	                var emptyElements = applier.getEmptyElements(range);
	
	                forEach(emptyElements, function(el) {
	                    removeClass(el, applier.className);
	                });
	            },
	
	            undoToRanges: function(ranges) {
	                // Get ranges returned in document order
	                var i = ranges.length;
	
	                while (i--) {
	                    this.undoToRange(ranges[i], ranges);
	                }
	
	                return ranges;
	            },
	
	            undoToSelection: function(win) {
	                var sel = api.getSelection(win);
	                var ranges = api.getSelection(win).getAllRanges();
	                this.undoToRanges(ranges);
	                sel.setRanges(ranges);
	            },
	
	            isAppliedToRange: function(range) {
	                if (range.collapsed || range.toString() == "") {
	                    return !!this.getSelfOrAncestorWithClass(range.commonAncestorContainer);
	                } else {
	                    var textNodes = range.getNodes( [3] );
	                    if (textNodes.length)
	                    for (var i = 0, textNode; textNode = textNodes[i++]; ) {
	                        if (!this.isIgnorableWhiteSpaceNode(textNode) && rangeSelectsAnyText(range, textNode) &&
	                                this.isModifiable(textNode) && !this.getSelfOrAncestorWithClass(textNode)) {
	                            return false;
	                        }
	                    }
	                    return true;
	                }
	            },
	
	            isAppliedToRanges: function(ranges) {
	                var i = ranges.length;
	                if (i == 0) {
	                    return false;
	                }
	                while (i--) {
	                    if (!this.isAppliedToRange(ranges[i])) {
	                        return false;
	                    }
	                }
	                return true;
	            },
	
	            isAppliedToSelection: function(win) {
	                var sel = api.getSelection(win);
	                return this.isAppliedToRanges(sel.getAllRanges());
	            },
	
	            toggleRange: function(range) {
	                if (this.isAppliedToRange(range)) {
	                    this.undoToRange(range);
	                } else {
	                    this.applyToRange(range);
	                }
	            },
	
	            toggleSelection: function(win) {
	                if (this.isAppliedToSelection(win)) {
	                    this.undoToSelection(win);
	                } else {
	                    this.applyToSelection(win);
	                }
	            },
	
	            getElementsWithClassIntersectingRange: function(range) {
	                var elements = [];
	                var applier = this;
	                range.getNodes([3], function(textNode) {
	                    var el = applier.getSelfOrAncestorWithClass(textNode);
	                    if (el && !contains(elements, el)) {
	                        elements.push(el);
	                    }
	                });
	                return elements;
	            },
	
	            detach: function() {}
	        };
	
	        function createClassApplier(className, options, tagNames) {
	            return new ClassApplier(className, options, tagNames);
	        }
	
	        ClassApplier.util = {
	            hasClass: hasClass,
	            addClass: addClass,
	            removeClass: removeClass,
	            getClass: getClass,
	            hasSameClasses: haveSameClasses,
	            hasAllClasses: hasAllClasses,
	            replaceWithOwnChildren: replaceWithOwnChildrenPreservingPositions,
	            elementsHaveSameNonClassAttributes: elementsHaveSameNonClassAttributes,
	            elementHasNonClassAttributes: elementHasNonClassAttributes,
	            splitNodeAt: splitNodeAt,
	            isEditableElement: isEditableElement,
	            isEditingHost: isEditingHost,
	            isEditable: isEditable
	        };
	
	        api.CssClassApplier = api.ClassApplier = ClassApplier;
	        api.createClassApplier = createClassApplier;
	        util.createAliasForDeprecatedMethod(api, "createCssClassApplier", "createClassApplier", module);
	    });
	    
	    return rangy;
	}, this);


/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Highlighter module for Rangy, a cross-browser JavaScript range and selection library
	 * https://github.com/timdown/rangy
	 *
	 * Depends on Rangy core, ClassApplier and optionally TextRange modules.
	 *
	 * Copyright 2015, Tim Down
	 * Licensed under the MIT license.
	 * Version: 1.3.0
	 * Build date: 10 May 2015
	 */
	(function(factory, root) {
	    if (true) {
	        // AMD. Register as an anonymous module with a dependency on Rangy.
	        !(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(17)], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    } else if (typeof module != "undefined" && typeof exports == "object") {
	        // Node/CommonJS style
	        module.exports = factory( require("rangy") );
	    } else {
	        // No AMD or CommonJS support so we use the rangy property of root (probably the global variable)
	        factory(root.rangy);
	    }
	})(function(rangy) {
	    rangy.createModule("Highlighter", ["ClassApplier"], function(api, module) {
	        var dom = api.dom;
	        var contains = dom.arrayContains;
	        var getBody = dom.getBody;
	        var createOptions = api.util.createOptions;
	        var forEach = api.util.forEach;
	        var nextHighlightId = 1;
	
	        // Puts highlights in order, last in document first.
	        function compareHighlights(h1, h2) {
	            return h1.characterRange.start - h2.characterRange.start;
	        }
	
	        function getContainerElement(doc, id) {
	            return id ? doc.getElementById(id) : getBody(doc);
	        }
	
	        /*----------------------------------------------------------------------------------------------------------------*/
	
	        var highlighterTypes = {};
	
	        function HighlighterType(type, converterCreator) {
	            this.type = type;
	            this.converterCreator = converterCreator;
	        }
	
	        HighlighterType.prototype.create = function() {
	            var converter = this.converterCreator();
	            converter.type = this.type;
	            return converter;
	        };
	
	        function registerHighlighterType(type, converterCreator) {
	            highlighterTypes[type] = new HighlighterType(type, converterCreator);
	        }
	
	        function getConverter(type) {
	            var highlighterType = highlighterTypes[type];
	            if (highlighterType instanceof HighlighterType) {
	                return highlighterType.create();
	            } else {
	                throw new Error("Highlighter type '" + type + "' is not valid");
	            }
	        }
	
	        api.registerHighlighterType = registerHighlighterType;
	
	        /*----------------------------------------------------------------------------------------------------------------*/
	
	        function CharacterRange(start, end) {
	            this.start = start;
	            this.end = end;
	        }
	
	        CharacterRange.prototype = {
	            intersects: function(charRange) {
	                return this.start < charRange.end && this.end > charRange.start;
	            },
	
	            isContiguousWith: function(charRange) {
	                return this.start == charRange.end || this.end == charRange.start;
	            },
	
	            union: function(charRange) {
	                return new CharacterRange(Math.min(this.start, charRange.start), Math.max(this.end, charRange.end));
	            },
	
	            intersection: function(charRange) {
	                return new CharacterRange(Math.max(this.start, charRange.start), Math.min(this.end, charRange.end));
	            },
	
	            getComplements: function(charRange) {
	                var ranges = [];
	                if (this.start >= charRange.start) {
	                    if (this.end <= charRange.end) {
	                        return [];
	                    }
	                    ranges.push(new CharacterRange(charRange.end, this.end));
	                } else {
	                    ranges.push(new CharacterRange(this.start, Math.min(this.end, charRange.start)));
	                    if (this.end > charRange.end) {
	                        ranges.push(new CharacterRange(charRange.end, this.end));
	                    }
	                }
	                return ranges;
	            },
	
	            toString: function() {
	                return "[CharacterRange(" + this.start + ", " + this.end + ")]";
	            }
	        };
	
	        CharacterRange.fromCharacterRange = function(charRange) {
	            return new CharacterRange(charRange.start, charRange.end);
	        };
	
	        /*----------------------------------------------------------------------------------------------------------------*/
	
	        var textContentConverter = {
	            rangeToCharacterRange: function(range, containerNode) {
	                var bookmark = range.getBookmark(containerNode);
	                return new CharacterRange(bookmark.start, bookmark.end);
	            },
	
	            characterRangeToRange: function(doc, characterRange, containerNode) {
	                var range = api.createRange(doc);
	                range.moveToBookmark({
	                    start: characterRange.start,
	                    end: characterRange.end,
	                    containerNode: containerNode
	                });
	
	                return range;
	            },
	
	            serializeSelection: function(selection, containerNode) {
	                var ranges = selection.getAllRanges(), rangeCount = ranges.length;
	                var rangeInfos = [];
	
	                var backward = rangeCount == 1 && selection.isBackward();
	
	                for (var i = 0, len = ranges.length; i < len; ++i) {
	                    rangeInfos[i] = {
	                        characterRange: this.rangeToCharacterRange(ranges[i], containerNode),
	                        backward: backward
	                    };
	                }
	
	                return rangeInfos;
	            },
	
	            restoreSelection: function(selection, savedSelection, containerNode) {
	                selection.removeAllRanges();
	                var doc = selection.win.document;
	                for (var i = 0, len = savedSelection.length, range, rangeInfo, characterRange; i < len; ++i) {
	                    rangeInfo = savedSelection[i];
	                    characterRange = rangeInfo.characterRange;
	                    range = this.characterRangeToRange(doc, rangeInfo.characterRange, containerNode);
	                    selection.addRange(range, rangeInfo.backward);
	                }
	            }
	        };
	
	        registerHighlighterType("textContent", function() {
	            return textContentConverter;
	        });
	
	        /*----------------------------------------------------------------------------------------------------------------*/
	
	        // Lazily load the TextRange-based converter so that the dependency is only checked when required.
	        registerHighlighterType("TextRange", (function() {
	            var converter;
	
	            return function() {
	                if (!converter) {
	                    // Test that textRangeModule exists and is supported
	                    var textRangeModule = api.modules.TextRange;
	                    if (!textRangeModule) {
	                        throw new Error("TextRange module is missing.");
	                    } else if (!textRangeModule.supported) {
	                        throw new Error("TextRange module is present but not supported.");
	                    }
	
	                    converter = {
	                        rangeToCharacterRange: function(range, containerNode) {
	                            return CharacterRange.fromCharacterRange( range.toCharacterRange(containerNode) );
	                        },
	
	                        characterRangeToRange: function(doc, characterRange, containerNode) {
	                            var range = api.createRange(doc);
	                            range.selectCharacters(containerNode, characterRange.start, characterRange.end);
	                            return range;
	                        },
	
	                        serializeSelection: function(selection, containerNode) {
	                            return selection.saveCharacterRanges(containerNode);
	                        },
	
	                        restoreSelection: function(selection, savedSelection, containerNode) {
	                            selection.restoreCharacterRanges(containerNode, savedSelection);
	                        }
	                    };
	                }
	
	                return converter;
	            };
	        })());
	
	        /*----------------------------------------------------------------------------------------------------------------*/
	
	        function Highlight(doc, characterRange, classApplier, converter, id, containerElementId) {
	            if (id) {
	                this.id = id;
	                nextHighlightId = Math.max(nextHighlightId, id + 1);
	            } else {
	                this.id = nextHighlightId++;
	            }
	            this.characterRange = characterRange;
	            this.doc = doc;
	            this.classApplier = classApplier;
	            this.converter = converter;
	            this.containerElementId = containerElementId || null;
	            this.applied = false;
	        }
	
	        Highlight.prototype = {
	            getContainerElement: function() {
	                return getContainerElement(this.doc, this.containerElementId);
	            },
	
	            getRange: function() {
	                return this.converter.characterRangeToRange(this.doc, this.characterRange, this.getContainerElement());
	            },
	
	            fromRange: function(range) {
	                this.characterRange = this.converter.rangeToCharacterRange(range, this.getContainerElement());
	            },
	
	            getText: function() {
	                return this.getRange().toString();
	            },
	
	            containsElement: function(el) {
	                return this.getRange().containsNodeContents(el.firstChild);
	            },
	
	            unapply: function() {
	                this.classApplier.undoToRange(this.getRange());
	                this.applied = false;
	            },
	
	            apply: function() {
	                this.classApplier.applyToRange(this.getRange());
	                this.applied = true;
	            },
	
	            getHighlightElements: function() {
	                return this.classApplier.getElementsWithClassIntersectingRange(this.getRange());
	            },
	
	            toString: function() {
	                return "[Highlight(ID: " + this.id + ", class: " + this.classApplier.className + ", character range: " +
	                    this.characterRange.start + " - " + this.characterRange.end + ")]";
	            }
	        };
	
	        /*----------------------------------------------------------------------------------------------------------------*/
	
	        function Highlighter(doc, type) {
	            type = type || "textContent";
	            this.doc = doc || document;
	            this.classAppliers = {};
	            this.highlights = [];
	            this.converter = getConverter(type);
	        }
	
	        Highlighter.prototype = {
	            addClassApplier: function(classApplier) {
	                this.classAppliers[classApplier.className] = classApplier;
	            },
	
	            getHighlightForElement: function(el) {
	                var highlights = this.highlights;
	                for (var i = 0, len = highlights.length; i < len; ++i) {
	                    if (highlights[i].containsElement(el)) {
	                        return highlights[i];
	                    }
	                }
	                return null;
	            },
	
	            removeHighlights: function(highlights) {
	                for (var i = 0, len = this.highlights.length, highlight; i < len; ++i) {
	                    highlight = this.highlights[i];
	                    if (contains(highlights, highlight)) {
	                        highlight.unapply();
	                        this.highlights.splice(i--, 1);
	                    }
	                }
	            },
	
	            removeAllHighlights: function() {
	                this.removeHighlights(this.highlights);
	            },
	
	            getIntersectingHighlights: function(ranges) {
	                // Test each range against each of the highlighted ranges to see whether they overlap
	                var intersectingHighlights = [], highlights = this.highlights;
	                forEach(ranges, function(range) {
	                    //var selCharRange = converter.rangeToCharacterRange(range);
	                    forEach(highlights, function(highlight) {
	                        if (range.intersectsRange( highlight.getRange() ) && !contains(intersectingHighlights, highlight)) {
	                            intersectingHighlights.push(highlight);
	                        }
	                    });
	                });
	
	                return intersectingHighlights;
	            },
	
	            highlightCharacterRanges: function(className, charRanges, options) {
	                var i, len, j;
	                var highlights = this.highlights;
	                var converter = this.converter;
	                var doc = this.doc;
	                var highlightsToRemove = [];
	                var classApplier = className ? this.classAppliers[className] : null;
	
	                options = createOptions(options, {
	                    containerElementId: null,
	                    exclusive: true
	                });
	
	                var containerElementId = options.containerElementId;
	                var exclusive = options.exclusive;
	
	                var containerElement, containerElementRange, containerElementCharRange;
	                if (containerElementId) {
	                    containerElement = this.doc.getElementById(containerElementId);
	                    if (containerElement) {
	                        containerElementRange = api.createRange(this.doc);
	                        containerElementRange.selectNodeContents(containerElement);
	                        containerElementCharRange = new CharacterRange(0, containerElementRange.toString().length);
	                    }
	                }
	
	                var charRange, highlightCharRange, removeHighlight, isSameClassApplier, highlightsToKeep, splitHighlight;
	
	                for (i = 0, len = charRanges.length; i < len; ++i) {
	                    charRange = charRanges[i];
	                    highlightsToKeep = [];
	
	                    // Restrict character range to container element, if it exists
	                    if (containerElementCharRange) {
	                        charRange = charRange.intersection(containerElementCharRange);
	                    }
	
	                    // Ignore empty ranges
	                    if (charRange.start == charRange.end) {
	                        continue;
	                    }
	
	                    // Check for intersection with existing highlights. For each intersection, create a new highlight
	                    // which is the union of the highlight range and the selected range
	                    for (j = 0; j < highlights.length; ++j) {
	                        removeHighlight = false;
	
	                        if (containerElementId == highlights[j].containerElementId) {
	                            highlightCharRange = highlights[j].characterRange;
	                            isSameClassApplier = (classApplier == highlights[j].classApplier);
	                            splitHighlight = !isSameClassApplier && exclusive;
	
	                            // Replace the existing highlight if it needs to be:
	                            //  1. merged (isSameClassApplier)
	                            //  2. partially or entirely erased (className === null)
	                            //  3. partially or entirely replaced (isSameClassApplier == false && exclusive == true)
	                            if (    (highlightCharRange.intersects(charRange) || highlightCharRange.isContiguousWith(charRange)) &&
	                                    (isSameClassApplier || splitHighlight) ) {
	
	                                // Remove existing highlights, keeping the unselected parts
	                                if (splitHighlight) {
	                                    forEach(highlightCharRange.getComplements(charRange), function(rangeToAdd) {
	                                        highlightsToKeep.push( new Highlight(doc, rangeToAdd, highlights[j].classApplier, converter, null, containerElementId) );
	                                    });
	                                }
	
	                                removeHighlight = true;
	                                if (isSameClassApplier) {
	                                    charRange = highlightCharRange.union(charRange);
	                                }
	                            }
	                        }
	
	                        if (removeHighlight) {
	                            highlightsToRemove.push(highlights[j]);
	                            highlights[j] = new Highlight(doc, highlightCharRange.union(charRange), classApplier, converter, null, containerElementId);
	                        } else {
	                            highlightsToKeep.push(highlights[j]);
	                        }
	                    }
	
	                    // Add new range
	                    if (classApplier) {
	                        highlightsToKeep.push(new Highlight(doc, charRange, classApplier, converter, null, containerElementId));
	                    }
	                    this.highlights = highlights = highlightsToKeep;
	                }
	
	                // Remove the old highlights
	                forEach(highlightsToRemove, function(highlightToRemove) {
	                    highlightToRemove.unapply();
	                });
	
	                // Apply new highlights
	                var newHighlights = [];
	                forEach(highlights, function(highlight) {
	                    if (!highlight.applied) {
	                        highlight.apply();
	                        newHighlights.push(highlight);
	                    }
	                });
	
	                return newHighlights;
	            },
	
	            highlightRanges: function(className, ranges, options) {
	                var selCharRanges = [];
	                var converter = this.converter;
	
	                options = createOptions(options, {
	                    containerElement: null,
	                    exclusive: true
	                });
	
	                var containerElement = options.containerElement;
	                var containerElementId = containerElement ? containerElement.id : null;
	                var containerElementRange;
	                if (containerElement) {
	                    containerElementRange = api.createRange(containerElement);
	                    containerElementRange.selectNodeContents(containerElement);
	                }
	
	                forEach(ranges, function(range) {
	                    var scopedRange = containerElement ? containerElementRange.intersection(range) : range;
	                    selCharRanges.push( converter.rangeToCharacterRange(scopedRange, containerElement || getBody(range.getDocument())) );
	                });
	
	                return this.highlightCharacterRanges(className, selCharRanges, {
	                    containerElementId: containerElementId,
	                    exclusive: options.exclusive
	                });
	            },
	
	            highlightSelection: function(className, options) {
	                var converter = this.converter;
	                var classApplier = className ? this.classAppliers[className] : false;
	
	                options = createOptions(options, {
	                    containerElementId: null,
	                    selection: api.getSelection(this.doc),
	                    exclusive: true
	                });
	
	                var containerElementId = options.containerElementId;
	                var exclusive = options.exclusive;
	                var selection = options.selection;
	                var doc = selection.win.document;
	                var containerElement = getContainerElement(doc, containerElementId);
	
	                if (!classApplier && className !== false) {
	                    throw new Error("No class applier found for class '" + className + "'");
	                }
	
	                // Store the existing selection as character ranges
	                var serializedSelection = converter.serializeSelection(selection, containerElement);
	
	                // Create an array of selected character ranges
	                var selCharRanges = [];
	                forEach(serializedSelection, function(rangeInfo) {
	                    selCharRanges.push( CharacterRange.fromCharacterRange(rangeInfo.characterRange) );
	                });
	
	                var newHighlights = this.highlightCharacterRanges(className, selCharRanges, {
	                    containerElementId: containerElementId,
	                    exclusive: exclusive
	                });
	
	                // Restore selection
	                converter.restoreSelection(selection, serializedSelection, containerElement);
	
	                return newHighlights;
	            },
	
	            unhighlightSelection: function(selection) {
	                selection = selection || api.getSelection(this.doc);
	                var intersectingHighlights = this.getIntersectingHighlights( selection.getAllRanges() );
	                this.removeHighlights(intersectingHighlights);
	                selection.removeAllRanges();
	                return intersectingHighlights;
	            },
	
	            getHighlightsInSelection: function(selection) {
	                selection = selection || api.getSelection(this.doc);
	                return this.getIntersectingHighlights(selection.getAllRanges());
	            },
	
	            selectionOverlapsHighlight: function(selection) {
	                return this.getHighlightsInSelection(selection).length > 0;
	            },
	
	            serialize: function(options) {
	                var highlighter = this;
	                var highlights = highlighter.highlights;
	                var serializedType, serializedHighlights, convertType, serializationConverter;
	
	                highlights.sort(compareHighlights);
	                options = createOptions(options, {
	                    serializeHighlightText: false,
	                    type: highlighter.converter.type
	                });
	
	                serializedType = options.type;
	                convertType = (serializedType != highlighter.converter.type);
	
	                if (convertType) {
	                    serializationConverter = getConverter(serializedType);
	                }
	
	                serializedHighlights = ["type:" + serializedType];
	
	                forEach(highlights, function(highlight) {
	                    var characterRange = highlight.characterRange;
	                    var containerElement;
	
	                    // Convert to the current Highlighter's type, if different from the serialization type
	                    if (convertType) {
	                        containerElement = highlight.getContainerElement();
	                        characterRange = serializationConverter.rangeToCharacterRange(
	                            highlighter.converter.characterRangeToRange(highlighter.doc, characterRange, containerElement),
	                            containerElement
	                        );
	                    }
	
	                    var parts = [
	                        characterRange.start,
	                        characterRange.end,
	                        highlight.id,
	                        highlight.classApplier.className,
	                        highlight.containerElementId
	                    ];
	
	                    if (options.serializeHighlightText) {
	                        parts.push(highlight.getText());
	                    }
	                    serializedHighlights.push( parts.join("$") );
	                });
	
	                return serializedHighlights.join("|");
	            },
	
	            deserialize: function(serialized) {
	                var serializedHighlights = serialized.split("|");
	                var highlights = [];
	
	                var firstHighlight = serializedHighlights[0];
	                var regexResult;
	                var serializationType, serializationConverter, convertType = false;
	                if ( firstHighlight && (regexResult = /^type:(\w+)$/.exec(firstHighlight)) ) {
	                    serializationType = regexResult[1];
	                    if (serializationType != this.converter.type) {
	                        serializationConverter = getConverter(serializationType);
	                        convertType = true;
	                    }
	                    serializedHighlights.shift();
	                } else {
	                    throw new Error("Serialized highlights are invalid.");
	                }
	
	                var classApplier, highlight, characterRange, containerElementId, containerElement;
	
	                for (var i = serializedHighlights.length, parts; i-- > 0; ) {
	                    parts = serializedHighlights[i].split("$");
	                    characterRange = new CharacterRange(+parts[0], +parts[1]);
	                    containerElementId = parts[4] || null;
	
	                    // Convert to the current Highlighter's type, if different from the serialization type
	                    if (convertType) {
	                        containerElement = getContainerElement(this.doc, containerElementId);
	                        characterRange = this.converter.rangeToCharacterRange(
	                            serializationConverter.characterRangeToRange(this.doc, characterRange, containerElement),
	                            containerElement
	                        );
	                    }
	
	                    classApplier = this.classAppliers[ parts[3] ];
	
	                    if (!classApplier) {
	                        throw new Error("No class applier found for class '" + parts[3] + "'");
	                    }
	
	                    highlight = new Highlight(this.doc, characterRange, classApplier, this.converter, parseInt(parts[2]), containerElementId);
	                    highlight.apply();
	                    highlights.push(highlight);
	                }
	                this.highlights = highlights;
	            }
	        };
	
	        api.Highlighter = Highlighter;
	
	        api.createHighlighter = function(doc, rangeCharacterOffsetConverterType) {
	            return new Highlighter(doc, rangeCharacterOffsetConverterType);
	        };
	    });
	    
	    return rangy;
	}, this);


/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Serializer module for Rangy.
	 * Serializes Ranges and Selections. An example use would be to store a user's selection on a particular page in a
	 * cookie or local storage and restore it on the user's next visit to the same page.
	 *
	 * Part of Rangy, a cross-browser JavaScript range and selection library
	 * https://github.com/timdown/rangy
	 *
	 * Depends on Rangy core.
	 *
	 * Copyright 2015, Tim Down
	 * Licensed under the MIT license.
	 * Version: 1.3.0
	 * Build date: 10 May 2015
	 */
	(function(factory, root) {
	    if (true) {
	        // AMD. Register as an anonymous module with a dependency on Rangy.
	        !(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(17)], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    } else if (typeof module != "undefined" && typeof exports == "object") {
	        // Node/CommonJS style
	        module.exports = factory( require("rangy") );
	    } else {
	        // No AMD or CommonJS support so we use the rangy property of root (probably the global variable)
	        factory(root.rangy);
	    }
	})(function(rangy) {
	    rangy.createModule("Serializer", ["WrappedSelection"], function(api, module) {
	        var UNDEF = "undefined";
	        var util = api.util;
	
	        // encodeURIComponent and decodeURIComponent are required for cookie handling
	        if (typeof encodeURIComponent == UNDEF || typeof decodeURIComponent == UNDEF) {
	            module.fail("encodeURIComponent and/or decodeURIComponent method is missing");
	        }
	
	        // Checksum for checking whether range can be serialized
	        var crc32 = (function() {
	            function utf8encode(str) {
	                var utf8CharCodes = [];
	
	                for (var i = 0, len = str.length, c; i < len; ++i) {
	                    c = str.charCodeAt(i);
	                    if (c < 128) {
	                        utf8CharCodes.push(c);
	                    } else if (c < 2048) {
	                        utf8CharCodes.push((c >> 6) | 192, (c & 63) | 128);
	                    } else {
	                        utf8CharCodes.push((c >> 12) | 224, ((c >> 6) & 63) | 128, (c & 63) | 128);
	                    }
	                }
	                return utf8CharCodes;
	            }
	
	            var cachedCrcTable = null;
	
	            function buildCRCTable() {
	                var table = [];
	                for (var i = 0, j, crc; i < 256; ++i) {
	                    crc = i;
	                    j = 8;
	                    while (j--) {
	                        if ((crc & 1) == 1) {
	                            crc = (crc >>> 1) ^ 0xEDB88320;
	                        } else {
	                            crc >>>= 1;
	                        }
	                    }
	                    table[i] = crc >>> 0;
	                }
	                return table;
	            }
	
	            function getCrcTable() {
	                if (!cachedCrcTable) {
	                    cachedCrcTable = buildCRCTable();
	                }
	                return cachedCrcTable;
	            }
	
	            return function(str) {
	                var utf8CharCodes = utf8encode(str), crc = -1, crcTable = getCrcTable();
	                for (var i = 0, len = utf8CharCodes.length, y; i < len; ++i) {
	                    y = (crc ^ utf8CharCodes[i]) & 0xFF;
	                    crc = (crc >>> 8) ^ crcTable[y];
	                }
	                return (crc ^ -1) >>> 0;
	            };
	        })();
	
	        var dom = api.dom;
	
	        function escapeTextForHtml(str) {
	            return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
	        }
	
	        function nodeToInfoString(node, infoParts) {
	            infoParts = infoParts || [];
	            var nodeType = node.nodeType, children = node.childNodes, childCount = children.length;
	            var nodeInfo = [nodeType, node.nodeName, childCount].join(":");
	            var start = "", end = "";
	            switch (nodeType) {
	                case 3: // Text node
	                    start = escapeTextForHtml(node.nodeValue);
	                    break;
	                case 8: // Comment
	                    start = "<!--" + escapeTextForHtml(node.nodeValue) + "-->";
	                    break;
	                default:
	                    start = "<" + nodeInfo + ">";
	                    end = "</>";
	                    break;
	            }
	            if (start) {
	                infoParts.push(start);
	            }
	            for (var i = 0; i < childCount; ++i) {
	                nodeToInfoString(children[i], infoParts);
	            }
	            if (end) {
	                infoParts.push(end);
	            }
	            return infoParts;
	        }
	
	        // Creates a string representation of the specified element's contents that is similar to innerHTML but omits all
	        // attributes and comments and includes child node counts. This is done instead of using innerHTML to work around
	        // IE <= 8's policy of including element properties in attributes, which ruins things by changing an element's
	        // innerHTML whenever the user changes an input within the element.
	        function getElementChecksum(el) {
	            var info = nodeToInfoString(el).join("");
	            return crc32(info).toString(16);
	        }
	
	        function serializePosition(node, offset, rootNode) {
	            var pathParts = [], n = node;
	            rootNode = rootNode || dom.getDocument(node).documentElement;
	            while (n && n != rootNode) {
	                pathParts.push(dom.getNodeIndex(n, true));
	                n = n.parentNode;
	            }
	            return pathParts.join("/") + ":" + offset;
	        }
	
	        function deserializePosition(serialized, rootNode, doc) {
	            if (!rootNode) {
	                rootNode = (doc || document).documentElement;
	            }
	            var parts = serialized.split(":");
	            var node = rootNode;
	            var nodeIndices = parts[0] ? parts[0].split("/") : [], i = nodeIndices.length, nodeIndex;
	
	            while (i--) {
	                nodeIndex = parseInt(nodeIndices[i], 10);
	                if (nodeIndex < node.childNodes.length) {
	                    node = node.childNodes[nodeIndex];
	                } else {
	                    throw module.createError("deserializePosition() failed: node " + dom.inspectNode(node) +
	                            " has no child with index " + nodeIndex + ", " + i);
	                }
	            }
	
	            return new dom.DomPosition(node, parseInt(parts[1], 10));
	        }
	
	        function serializeRange(range, omitChecksum, rootNode) {
	            rootNode = rootNode || api.DomRange.getRangeDocument(range).documentElement;
	            if (!dom.isOrIsAncestorOf(rootNode, range.commonAncestorContainer)) {
	                throw module.createError("serializeRange(): range " + range.inspect() +
	                    " is not wholly contained within specified root node " + dom.inspectNode(rootNode));
	            }
	            var serialized = serializePosition(range.startContainer, range.startOffset, rootNode) + "," +
	                serializePosition(range.endContainer, range.endOffset, rootNode);
	            if (!omitChecksum) {
	                serialized += "{" + getElementChecksum(rootNode) + "}";
	            }
	            return serialized;
	        }
	
	        var deserializeRegex = /^([^,]+),([^,\{]+)(\{([^}]+)\})?$/;
	
	        function deserializeRange(serialized, rootNode, doc) {
	            if (rootNode) {
	                doc = doc || dom.getDocument(rootNode);
	            } else {
	                doc = doc || document;
	                rootNode = doc.documentElement;
	            }
	            var result = deserializeRegex.exec(serialized);
	            var checksum = result[4];
	            if (checksum) {
	                var rootNodeChecksum = getElementChecksum(rootNode);
	                if (checksum !== rootNodeChecksum) {
	                    throw module.createError("deserializeRange(): checksums of serialized range root node (" + checksum +
	                        ") and target root node (" + rootNodeChecksum + ") do not match");
	                }
	            }
	            var start = deserializePosition(result[1], rootNode, doc), end = deserializePosition(result[2], rootNode, doc);
	            var range = api.createRange(doc);
	            range.setStartAndEnd(start.node, start.offset, end.node, end.offset);
	            return range;
	        }
	
	        function canDeserializeRange(serialized, rootNode, doc) {
	            if (!rootNode) {
	                rootNode = (doc || document).documentElement;
	            }
	            var result = deserializeRegex.exec(serialized);
	            var checksum = result[3];
	            return !checksum || checksum === getElementChecksum(rootNode);
	        }
	
	        function serializeSelection(selection, omitChecksum, rootNode) {
	            selection = api.getSelection(selection);
	            var ranges = selection.getAllRanges(), serializedRanges = [];
	            for (var i = 0, len = ranges.length; i < len; ++i) {
	                serializedRanges[i] = serializeRange(ranges[i], omitChecksum, rootNode);
	            }
	            return serializedRanges.join("|");
	        }
	
	        function deserializeSelection(serialized, rootNode, win) {
	            if (rootNode) {
	                win = win || dom.getWindow(rootNode);
	            } else {
	                win = win || window;
	                rootNode = win.document.documentElement;
	            }
	            var serializedRanges = serialized.split("|");
	            var sel = api.getSelection(win);
	            var ranges = [];
	
	            for (var i = 0, len = serializedRanges.length; i < len; ++i) {
	                ranges[i] = deserializeRange(serializedRanges[i], rootNode, win.document);
	            }
	            sel.setRanges(ranges);
	
	            return sel;
	        }
	
	        function canDeserializeSelection(serialized, rootNode, win) {
	            var doc;
	            if (rootNode) {
	                doc = win ? win.document : dom.getDocument(rootNode);
	            } else {
	                win = win || window;
	                rootNode = win.document.documentElement;
	            }
	            var serializedRanges = serialized.split("|");
	
	            for (var i = 0, len = serializedRanges.length; i < len; ++i) {
	                if (!canDeserializeRange(serializedRanges[i], rootNode, doc)) {
	                    return false;
	                }
	            }
	
	            return true;
	        }
	
	        var cookieName = "rangySerializedSelection";
	
	        function getSerializedSelectionFromCookie(cookie) {
	            var parts = cookie.split(/[;,]/);
	            for (var i = 0, len = parts.length, nameVal, val; i < len; ++i) {
	                nameVal = parts[i].split("=");
	                if (nameVal[0].replace(/^\s+/, "") == cookieName) {
	                    val = nameVal[1];
	                    if (val) {
	                        return decodeURIComponent(val.replace(/\s+$/, ""));
	                    }
	                }
	            }
	            return null;
	        }
	
	        function restoreSelectionFromCookie(win) {
	            win = win || window;
	            var serialized = getSerializedSelectionFromCookie(win.document.cookie);
	            if (serialized) {
	                deserializeSelection(serialized, win.doc);
	            }
	        }
	
	        function saveSelectionCookie(win, props) {
	            win = win || window;
	            props = (typeof props == "object") ? props : {};
	            var expires = props.expires ? ";expires=" + props.expires.toUTCString() : "";
	            var path = props.path ? ";path=" + props.path : "";
	            var domain = props.domain ? ";domain=" + props.domain : "";
	            var secure = props.secure ? ";secure" : "";
	            var serialized = serializeSelection(api.getSelection(win));
	            win.document.cookie = encodeURIComponent(cookieName) + "=" + encodeURIComponent(serialized) + expires + path + domain + secure;
	        }
	
	        util.extend(api, {
	            serializePosition: serializePosition,
	            deserializePosition: deserializePosition,
	            serializeRange: serializeRange,
	            deserializeRange: deserializeRange,
	            canDeserializeRange: canDeserializeRange,
	            serializeSelection: serializeSelection,
	            deserializeSelection: deserializeSelection,
	            canDeserializeSelection: canDeserializeSelection,
	            restoreSelectionFromCookie: restoreSelectionFromCookie,
	            saveSelectionCookie: saveSelectionCookie,
	            getElementChecksum: getElementChecksum,
	            nodeToInfoString: nodeToInfoString
	        });
	
	        util.crc32 = crc32;
	    });
	    
	    return rangy;
	}, this);

/***/ }),
/* 21 */
/***/ (function(module, exports) {

	exports.emit = (eventName, data) => {
	  let event = document.createEvent('CustomEvent');
	  event.initCustomEvent(eventName, true, true, data);
	  window.dispatchEvent(event);
	};


/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

	const RelationAnnotation = __webpack_require__(14);
	const Annotation = __webpack_require__(13);
	
	class ArrowConnector{
	  constructor(annotationContainer){
	    this.annotations = annotationContainer;
	  }
	
	  get(id, referenceId){
	    this.annotations.findById(Annotation.createId(id, referenceId));
	  }
	
	  add(data){
	    this.annotations.add(data);
	  }
	
	  createRelation(id, startingCircle, endingCircle, direction, text, referenceId){
	    let relation = new RelationAnnotation(id, startingCircle, endingCircle, direction, referenceId);
	    this.annotations.add(relation);
	    relation.setContent(text);
	
	    return relation;
	  }
	
	  addToml(id, toml, referenceId){
	    return this.createRelation(
	      id,
	      this.annotations.findById(
	        Annotation.createId(parseInt(toml.ids[0]), referenceId)
	      ).circle,
	      this.annotations.findById(
	        Annotation.createId(parseInt(toml.ids[1]), referenceId)
	      ).circle,
	      toml.dir, toml.label,
	      referenceId
	    );
	  }
	
	  remove(referenceId){
	    let promises = [];
	    this.annotations.forEach((annotation, i)=>{
	      if (annotation instanceof RelationAnnotation) {
	        if (undefined != referenceId) {
	          if (referenceId == annotation.getReferenceId()) {
	            promises.push(new Promise((resolve, reject) => {
	              this.annotations.remove(i);
	              resolve(annotation);
	            })); 
	          }
	        } else {
	          promises.push(new Promise((resolve, reject) => {
	            this.annotations.remove(i);
	            resolve(annotation);
	          }));
	        }
	      }
	    });
	    return Promise.all(promises);
	  }
	
	  removeAnnotation(arrow){
	    this.annotations.remove(arrow);
	  }
	}
	
	module.exports = ArrowConnector;


/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

	const Bioes = __webpack_require__(24);
	
	class FileContainer {
	  constructor() {
	    this._contents = [];
	    this._annotations = [];
	  }
	
	  /**
	   * @param files ... Array of File(Blob)
	   *
	   * @return Promise({contents, annotations}) or Promise(cannot_read_filename)
	   */
	  loadFiles(files) {
	    this._contents = [];
	    this._annotations = [];
	    let categoraizedFiles = this._categorize(files);
	
	    return Promise.all([
	      new Promise((resolve, reject) => {
	        this._createHtmlContents(categoraizedFiles[0]);
	        resolve(true);
	      }).then(),
	      new Promise((resolve, reject) => {
	        this._createTextContents(categoraizedFiles[1])
	        resolve(true);
	      }).then(),
	      Promise.all(
	        this._createAnnotationLoadingPromiseList(categoraizedFiles[2])
	      ).then(this._mergeAnnotations.bind(this)),
	      new Promise((resolve, reject) => {
	        this._createBioesContents(categoraizedFiles[3]);
	        resolve(true);
	      })
	    ]).then(this._allResult.bind(this));
	  }
	
	  /**
	   * @param fileName ... maybe equal to this.contents[n].name
	   * @return this.contents[n] or null
	   *
	   * contents[n] = {
	   *   type    : 'html' or 'text'
	   *   name    : fileName
	   *   content : undefined or HTML soruce or Plain text
	   *   source  : File object or undefined
	   *   selected: boolean 
	   * }
	   * If content is undefined, you need get content by source. and after load, set the content to content, and set undefined to source.
	   */
	  getContent(fileName) {
	    return this._getItem(fileName, this._contents);
	  }
	
	  /**
	   * @param fileName ... maybe equal to this.annotations[n].name
	   * @return this.annotations[n] or null
	   *
	   * annotation[n] = {
	   *   type     : 'annotation'
	   *   subtype  : 'bioes' or undefined (Using only BIOES annotation)
	   *   name     : fileName
	   *   content  : TOML source or undefined (When it is undefined, source must be defined.)
	   *   source   : File object or undefined
	   *   primary  : boolean
	   *   reference: boolean
	   * }
	   */
	  getAnnotation(fileName) {
	    return this._getItem(fileName, this._annotations);
	  }
	
	  getAnnotations(fileNames) {
	    let annotations = [];
	    fileNames.forEach((fileName) => {
	      let anno = this.getAnnotation(fileName);
	      if (null != anno) {
	        annotations.push(anno);
	      }
	    });
	    return annotations;
	  }
	
	  // TODO: Needless...?
	  addAnnotation(fileName, annotation) {
	    let old = this.getAnnotation(fileName);
	    if (null == old) {
	      this._annotations.push({
	        type: 'annotation',
	        name: fileName,
	        content: annotation,
	        primary: false,
	        reference: false
	      });
	      return true;
	    } else {
	      return false;
	    }
	  }
	
	  /**
	   * All contents array getter.
	   * @return this._contents(reference)
	   */
	  get contents() {
	    return this._contents;
	  }
	
	  /**
	   * All annotations array getter.
	   * @return this._annotations(reference)
	   */
	  get annotations() {
	    return this._annotations;
	  }
	
	  /**
	   * Read `file`, parse read result as HTML, and call `callback` with parse result.
	   * @param file ... HTML file object
	   * @param callback ... callback(read result) or callback(undefined)
	   * @see FileContainer.parseHtml
	   */ 
	  static htmlLoader(file, callback) {
	    FileContainer._fileReader(file, (read_result) => {
	      if (undefined == read_result) {
	        callback(undefined);
	      } else {
	        callback(FileContainer.parseHtml(read_result));
	      }
	    });
	  }
	
	  /**
	   * Read `file`, and call `callback` with read result that wrapped `<p>` tag.
	   * @param file ... Plain text file object
	   * @param callback ... callback(read result) or callback(undefined)
	   */
	  static textLoader(file, callback) {
	    FileContainer._fileReader(file, (read_result) => {
	      if (undefined == read_result) {
	        callback(undefined);
	      } else {
	        callback(`<p>${read_result}</p>`);
	      }
	    });
	  }
	
	  /**
	   * Read `file`, parse read result as BIOES, and call `callback` with Bioes object.
	   * @param file ... BIOES file object
	   * @param callback ... callback(Bioes object) or callback(undefined)
	   */
	  static bioesLoader(file, callback) {
	    FileContainer._fileReader(file, (read_result) => {
	      if (undefined == read_result) {
	        callback(undefined);
	      } else {
	        let bioes = new Bioes();
	        if (bioes.parse(read_result)) {
	          callback(bioes);
	        } else {
	          callback(undefined);
	        }
	      }
	    });
	  }
	
	  static parseHtml(html) {
	    let sgmlFunc  = new RegExp(/<\?.+\?>/g);
	    let comment   = new RegExp(/<!--.+-->/g);
	    let htmlTag = new RegExp(/<html\s?.*>/i);
	
	    if (null != html.match(htmlTag)) {
	      let bodyStart = html.match(/<body\s?.*>/im);
	      let bodyEnd   = html.search(/<\/body>/im);
	      if (null != bodyStart && -1 != bodyEnd){
	        html = html.substring((bodyStart.index + bodyStart[0].length), bodyEnd);
	      }
	      return html.replace(sgmlFunc, '').replace(comment, '');
	    } else {
	      return undefined;
	    }
	  }
	
	  static _fileReader(file, callback) {
	    let reader = new FileReader();
	    reader.onload = () => {
	      callback(reader.result);
	    };
	    reader.onerror = () => {callback(undefined); };
	    reader.onabort = () => {callback(undefined); };
	
	    reader.readAsText(file);
	  }
	
	  _getItem(name, container) {
	    for(let i = 0; i < container.length; i ++) {
	      if (container[i].name === name) {
	        return container[i];
	      }
	    }
	    return null;
	  }
	
	  _createHtmlContents(files) {
	    files.forEach((file) => {
	      this._contents.push({
	        type   : 'html',
	        name   : this._excludeBaseDirName(file.webkitRelativePath),
	        content: undefined,
	        source : file,
	        selected: false
	      });
	    });
	  }
	
	  _createTextContents(files) {
	    files.forEach((file) => {
	      this._contents.push({
	        type   : 'text',
	        name   : this._excludeBaseDirName(file.webkitRelativePath),
	        content: undefined,
	        source: file,
	        selected: false
	      });
	    });
	  }
	
	  _createBioesContents(files) {
	    files.forEach((file) => {
	      this._contents.push({
	        type    : 'bioes',
	        name    : this._excludeBaseDirName(file.webkitRelativePath),
	        content : undefined,
	        source  : file,
	        selected: false
	      });
	      this._annotations.push({
	        type     : 'annotation',
	        subtype  : 'bioes',
	        name     : this._excludeBaseDirName(file.webkitRelativePath),
	        content  : undefined,
	        source   : file,
	        primary  : false,
	        reference: false
	      });
	    });
	  }
	
	  _createAnnotationLoadingPromiseList(files) {
	    let promises = [];
	    files.forEach((file) => {
	      promises.push(new Promise((resolve, reject) => {
	        let reader = new FileReader();
	        reader.onload = ()=>{
	          resolve({
	            type     : 'annotation',
	            subtype  : undefined,
	            name     : this._excludeBaseDirName(file.webkitRelativePath),
	            content  : reader.result,
	            source   : undefined,
	            primary  : false,
	            reference: false
	          });
	        };
	        reader.onerror = () => { alert("Load failed."); };  // TODO: UI実装後に適時変更
	        reader.onabort = () => { alert("Load aborted."); }; // TODO: UI実装後に適宜変更
	
	        reader.readAsText(file);
	      }));
	    });
	    return promises;
	  }
	
	  _categorize(files){
	    let htmlMatcher  = new RegExp(/.+\.xhtml$/i);
	    let textMatcher  = new RegExp(/.+\.txt$/i);
	    let annoMatcher  = new RegExp(/.+\.htmlanno$/i);
	    let bioesMatcher = new RegExp(/.+\.BIOES$/i);
	
	    let htmlNames  = [];
	    let textNames  = [];
	    let annoNames  = [];
	    let bioesNames = [];
	    for(let i = 0;i < files.length; i ++ ){
	      let file = files[i];
	
	      let fragments = file.webkitRelativePath.split('/');
	      if (2 >= fragments.length){
	        let fileName = fragments.pop();
	        if (htmlMatcher.test(fileName)){
	          htmlNames.push(file);
	        } else if (textMatcher.test(fileName)){
	          textNames.push(file);
	        } else if (annoMatcher.test(fileName)){
	          annoNames.push(file);
	        } else if (bioesMatcher.test(fileName)){
	          bioesNames.push(file);
	        }
	      }        
	      // else, skip it.
	    }
	    return [
	      htmlNames,
	      textNames,
	      annoNames,
	      bioesNames
	    ];
	  }
	
	  _excludeBaseDirName(filePath){
	    let fragments = filePath.split('/');
	    return fragments[fragments.length - 1];
	  }
	
	  /**
	   * For loadFiles()
	   */
	  _merge(fromArray, toArray) {
	    fromArray.forEach((elm) => {
	      toArray.push(elm);
	    });
	  }
	  /**
	   * For loadFiles()
	   */
	  _mergeContents(results) {
	    this._merge(results, this._contents);
	  }
	  /**
	   * For loadFiles()
	   */
	  _mergeAnnotations(results) {
	    this._merge(results, this._annotations);
	  }
	  /**
	   * For loadFiles()
	   */
	  _allResult(all_results) {
	    return Promise.resolve({
	      contents: this._contents,
	      annotations: this._annotations
	    });
	  }
	
	}
	module.exports = FileContainer;


/***/ }),
/* 24 */
/***/ (function(module, exports) {

	class Bioes {
	  constrcutor() {
	    this._content = undefined;
	    this._annotations = undefined;
	  }
	
	  /**
	   * Field Separator
	   */
	  get FS() {
	    return "\t";
	  }
	
	  /**
	   * Line Separator (Regular Expression)
	   */
	  get LS() {
	    return /\r\n|\n|\r/;
	  }
	
	  get content() {
	    return this._content;
	  }
	
	  get annotations() {
	    return this._annotations;
	  }
	
	  /**
	   * @params bioes ... String object of BIOES format.
	   */
	  parse(bioes) {
	    if (undefined === bioes) {
	      return undefined;
	    }
	
	    // '<p>xxx<p><p>yyy zzz</p><p>111</p>
	    this._content = '';
	    // The array includes Toml Object.
	    this._annotations = [];
	
	    // ['xxx', 'yyy zzz, '111', ...]
	    let contentArray = [];
	    // ['yyy', 'zzz']
	    let currentContentArray = [];
	    // Toml object
	    let currentSpan = undefined;
	    bioes.split(this.LS).forEach((line) => {
	      if (0 == line.length) {
	        // Next paragraph.
	        this._createParagraph(currentContentArray, contentArray);
	        currentContentArray = [];
	      }
	      let fsIndex = line.indexOf(this.FS);
	      if (-1 != fsIndex) {
	        let word = line.substring(0, fsIndex);
	        let type = line.substring(fsIndex+1);
	
	        currentContentArray.push(word);
	        switch(type[0]) {
	           case 'B': // Begin span.
	             if (undefined == currentSpan) {
	               currentSpan = this._createSpanObject(
	                 this._parseLabel(type), currentContentArray
	               );
	             } else {
	               // TODO: フォーマットエラー
	               // ignore inner span.
	             }
	             break;
	           case 'I': // Internal of span.
	             // if (undefined == currentSpan) {
	             // TODO: フォーマットエラー
	             // }
	             break;
	           case 'E': // End span.
	             if (undefined != currentSpan) {
	               this._annotations.push(
	                 this._createTomlObj(currentSpan, currentContentArray, contentArray)
	               );
	               currentSpan = undefined;
	             } else {
	               // TODO: フォーマットエラー
	             }
	             break;
	           case 'S': // Single a span.
	             this._annotations.push(
	               this._createTomlObj(
	                 this._createSpanObject(this._parseLabel(type), currentContentArray),
	                 currentContentArray,
	                 contentArray
	               )
	             );
	             break;
	           case 'O': // Other.
	             break;
	           default:
	             // Invalid tag, ignore.
	        }
	      }
	      // TODO: フォーマットエラー
	    });
	    this._createParagraph(currentContentArray, contentArray);
	    this._content = this._contentArrayToString(contentArray);
	    return true;
	  }
	
	  _createSpanObject(label, contentArray) {
	    return {
	      startIndex: (contentArray.length - 1),
	      label: label
	    };
	  }
	
	  _parseLabel(tag) {
	    return 1 == tag.length ? tag : tag.substring(2);
	  }
	
	  _createParagraph(currentContentArray, contentArray) {
	    if (0 < currentContentArray.length) {
	      contentArray.push(currentContentArray.join(' '));
	    }
	  }
	
	  _createTomlObj(spanObject, currentContentArray, contentArray) {
	    let beforeContent =
	      contentArray.join('') +
	      currentContentArray.slice(0, spanObject.startIndex).join(' ');
	    let content = currentContentArray.slice(spanObject.startIndex).join(' ');
	    
	    let start = beforeContent.length;
	    // Add the last space before context.
	    start += 0 == spanObject.startIndex ? 0: 1;
	    return {
	      type: 'span',
	      position: [start, (start + content.length)],
	      text: content,
	      label: spanObject.label
	    };
	  }
	
	  _contentArrayToString(contentArray) {
	    return `<p>${contentArray.join('</p><p>')}</p>`;
	  }
	}
	
	module.exports = Bioes;


/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

	const FileContainer = __webpack_require__(23);
	
	/**
	 * @param content ... Content object or Annotation object
	 * @param htmlanno .. Htmlanno object
	 *
	 * If content has `subtype` attribute and this value is `bioes`, content is (BIOES) Annotation object.
	 */
	exports.run = (content, htmlanno) => {
	  return Promise.all([
	    new Promise((resolve, reject) => {
	      let pattern = new RegExp(/\.htmlanno/);
	      htmlanno.hideAnnotationElements('Primary', pattern);
	      htmlanno.hideAnnotationElements('Reference', pattern);
	      resolve();
	    }),
	    new Promise((resolve, reject) => {
	      let annotation = 'bioes' == content.subtype ?
	        content :
	        htmlanno.fileContainer.getAnnotation(content.name);
	      if (undefined == content.content) {
	        FileContainer.bioesLoader(content.source, (bioes) => {
	          if (undefined == bioes) {
	            reject();
	          } else {
	            annotation.content = bioes.annotations;
	            annotation.source = undefined;
	            resolve({content: bioes.content, annotation: annotation});
	          }
	        });
	      } else {
	        annotation.primary = true;
	        resolve({content: content.content, annotation: annotation});
	      }
	    })
	  ]);
	};


/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

	const FileContainer = __webpack_require__(23);
	const HideBioesAnnotation = __webpack_require__(27);
	
	exports.run = (content, htmlanno) => {
	  return Promise.all([
	    HideBioesAnnotation.create(htmlanno),
	    new Promise((resolve, reject) => {
	      if (undefined == content.content) {
	        FileContainer.htmlLoader(content.source, (html) => {
	          if (undefined != html) {
	            resolve(html);
	          } else {
	            reject();
	          }
	        });
	      } else {
	        resolve(content.content);
	      }
	    })
	  ]);
	};


/***/ }),
/* 27 */
/***/ (function(module, exports) {

	exports.create = (htmlanno) => {
	  return new Promise((resolve, reject) => {
	    let pattern = new RegExp(/\.BIOES/);
	    htmlanno.hideAnnotationElements('Primary', pattern);
	    htmlanno.hideAnnotationElements('Reference', pattern);
	    resolve();
	  });
	};
	 


/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

	const FileContainer = __webpack_require__(23);
	const HideBioesAnnotation = __webpack_require__(27);
	
	exports.run = (content, htmlanno) => {
	  return Promise.all([
	    HideBioesAnnotation.create(htmlanno),
	    new Promise((resolve, reject) => {
	      if (undefined == content.content) {
	        FileContainer.textLoader(content.source, (text) => {
	          if (undefined != text) {
	            resolve(text);
	          } else {
	            reject();
	          }
	        });
	      } else {
	        resolve(content.content);
	      }
	    })
	  ]);
	};


/***/ })
/******/ ]);
//# sourceMappingURL=bundle.js.map