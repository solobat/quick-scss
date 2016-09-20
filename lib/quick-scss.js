'use babel';

import QuickScssView from './quick-scss-view';
import { CompositeDisposable } from 'atom';
import path from 'path';
import fs from 'fs-plus';
import _ from 'underscore-plus';

var scssVarReg = /\$[\w\-_]+/g;
var settingsFileReg = /\.(scss|sass)$/;

export default {

  quickScssView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.quickScssView = new QuickScssView(state.quickScssViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.quickScssView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-text-editor', {
      'quick-scss:goto': () => this.goto()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.quickScssView.destroy();
  },

  serialize() {
    return {
      quickScssViewState: this.quickScssView.serialize()
    };
  },

  getFile() {

  },

  detectFilePath(filePath) {

  },

  goto(state) {
    var editor = atom.workspace.getActiveTextEditor();
    var cursorPosition = editor.getCursorBufferPosition();
    var scanRange = editor.bufferRangeForBufferRow(cursorPosition.row);
    var varName;

    editor.scanInBufferRange(scssVarReg, scanRange, function(res) {
      if (res.range.containsPoint(cursorPosition)) {
        varName = res.matchText;
        res.stop();
      }
    });

    if (!varName) {
      return;
    }

    var curFilePath = editor.getPath();

    if (!curFilePath || !curFilePath.match(settingsFileReg)) {
      return;
    }

    var settingsFilePath = curFilePath.replace(settingsFileReg, '-settings.$1');

    // read settings file
    // file the var's line num
    if (!fs.existsSync(settingsFilePath)) {
      return;
    }

    var settingsText = fs.readFileSync(settingsFilePath, 'utf8');
    var targeLineNum = 1;
    var targeColumnNum = 1;

    settingsText.split(/\r?\n/).forEach(function(line, index) {
      var vn = varName + ':';
      var pos = line.indexOf(vn);

      if (pos != -1) {
        targeLineNum = index + 1;
        // goto: `$var: |`
        targeColumnNum = pos + vn.length + 2;

        return true;
      }
    });

    // open file
    var pane = atom.workspace.getActivePane();

    var options = {searchAllPanes: false};

    options.initialLine = (targeLineNum - 1) || 1;
    options.initialColumn = (targeColumnNum - 1) || 1;

    atom.workspace.open(settingsFilePath, options)
  }
};
