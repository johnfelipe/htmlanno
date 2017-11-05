const {test} = QUnit;

const EventManager = require('../src/eventmanager.js');
window.globalEvent = new EventManager(); // Highlightのロード段階でCircleにより参照される

const AnnotationContainer = require('../src/annotationcontainer.js');
const Highlight = require('../src/highlight.js');

QUnit.module('Highlight', {
  before: () => {
    this.instance = undefined;
    this.dummyId = new Date().getTime().toString();
    this.dummyStart = 10;
    this.dummyEnd   = 15;
  },
  after: () => {
    window.globalEvent = undefined;
  },
  beforeEach: () => {
    window.annotationContainer = new AnnotationContainer();
    // 実際にはインスタンス生成に先立って設置されたHTMLタグをjQueryで選択したもの
    this.dummyElements = [
      document.createElement('span'),
      document.createElement('span'),
      document.createElement('span')
    ];
    this.dummyElements.forEach((elm) => {
      // @see Highlighter#create
      elm.className = 'htmlanno-highlight' + this.dummyId;
      elm.innerText = 'TEST TEST TEST';
      $('#viewer')[0].appendChild(elm);
    });
    this.instance = new Highlight(
      this.dummyId,
      this.dummyStart,
      this.dummyEnd,
      this.dummyElements
    );
  },
  afterEach: () => {
    this.instance.remove(); // これをやらないとイベントリスナ等が残る場合がある(クラスによる)
    $('#viewer htmlanno-highlight').each((i, elm) => {
      $('#viewer')[0].removeChild(elm);
    });
  }
}, () => {
  test('instance should have #id, #startOffset, #endOffset, #elements, #topElement, #circle and #jObject', (assert) => {
    assert.ok(this.instance.id === this.dummyId);
    assert.ok(this.instance.startOffset === this.dummyStart);
    assert.ok(this.instance.endOffset === this.dummyEnd);
    assert.ok(this.instance.elements === this.dummyElements);
    assert.ok(this.instance.topElement === this.dummyElements[0]);
    assert.equal(this.instance.circle.constructor.name, 'Circle');
    assert.ok(this.instance.circle.highlight === this.instance);
    assert.equal(this.instance.jObject.length, 3);
    this.instance.jObject.each((i, elm) => {
      assert.ok(elm.classList.contains('htmlanno-highlight' + this.dummyId));
    });
  });
  
  // TODO: 後回し
  QUnit.skip('handleHoverIn');
  // TODO: 後回し
  QUnit.skip('handleHoverOut');
  // コンストラクタから呼び出される
  QUnit.skip('addCircle');
  
  test('getClassName() should return "htmlanno-hl-" + #id', (assert) => {
    assert.equal(this.instance.getClassName(), 'htmlanno-hl-' + this.dummyId);
  });
  
  test('getClassName() should return "htmlanno-hl-" + #id + "-" + #referenceId when it has referenceId', (assert) => {
    let withReferenceId = new Highlight(
      this.dummyId, this.dummyStart, this.dummyEnd, this.dummyElements, 'referenceId'
    );
    assert.equal(withReferenceId.getClassName(), 'htmlanno-hl-' + this.dummyId + '-referenceId');
    withReferenceId.remove(); // これをやらないとイベントリスナ等が残る場合がある(クラスによる)
  });
  
  // TODO: 後回し
  QUnit.skip('getBoundingClientRect()');
  
  test('setClass()', (assert) => {
  });
  
  // TODO: 後回し
  QUnit.skip('addClass()');
  
  // TODO: 後回し
  QUnit.skip('removeClass()');
  // TODO: 後回し
  QUnit.skip('select()');
  // TODO: 後回し
  QUnit.skip('blur()');
  
  test('remove()', (assert) => {
  });
  
  // TODO: 後回し
  QUnit.skip('saveToml()');
  // TODO: 後回し
  QUnit.skip('isMydata()');
  // TODO: 後回し
  QUnit.skip('setContent()');
  // TODO: 後回し
  QUnit.skip('content()');
  
  test('type(getter) should return "span"', (assert) => {
  });
  
  // TODO: 後回し
  QUnit.skip('scrollTop(getter)');
  // TODO: 後回し
  QUnit.skip('blink()');
  // TODO: 後回し
  QUnit.skip('setColor()');
  // TODO: 後回し
  QUnit.skip('removeColor()');
});
