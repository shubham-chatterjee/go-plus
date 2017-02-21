'use babel'
/* eslint-env jasmine */

import path from 'path'
import fs from 'fs-plus'
import {lifecycle} from './../spec-helpers'

describe('gomodifytags', () => {
  let gopath = null
  let editor = null
  let gomodifytags = null
  let source = null
  let target = null

  beforeEach(() => {
    runs(() => {
      lifecycle.setup()

      gopath = fs.realpathSync(lifecycle.temp.mkdirSync('gopath-'))
      process.env.GOPATH = gopath
    })

    waitsForPromise(() => {
      return lifecycle.activatePackage()
    })

    runs(() => {
      const {mainModule} = lifecycle
      mainModule.provideGoConfig()
      mainModule.loadGoModifyTags()
    })

    waitsFor(() => {
      gomodifytags = lifecycle.mainModule.gomodifytags
      return gomodifytags
    })

    afterEach(() => {
      lifecycle.teardown()
    })
  })

  describe('when a file is open', () => {
    beforeEach(() => {
      runs(() => {
        source = path.join(__dirname, '..', 'fixtures', 'gomodifytags')
        target = path.join(gopath, 'src', 'gomodifytags')
        fs.copySync(source, target)
      })

      waitsForPromise(() => {
        return atom.workspace.open(path.join(target, 'foo.go')).then((e) => {
          editor = e
          return
        })
      })
    })

    describe('argument builder', () => {
      let options

      beforeEach(() => {
        options = {
          tags: [{tag: 'xml', option: null}, {tag: 'bson', option: null}],
          useSnakeCase: true,
          sortTags: false
        }
      })

      it('includes the -file option', () => {
        const args = gomodifytags.buildArgs(editor, options, 'Add')
        expect(args.length).toBeGreaterThan(1)
        expect(args[0]).toBe('-file')
        expect(args[1]).toBe('foo.go')
      })

      it('defaults to json if no tags are specified', () => {
        editor.setCursorBufferPosition([4, 6])
        options.tags = []
        const args = gomodifytags.buildArgs(editor, options, 'Add')
        const i = args.indexOf('-add-tags')
        expect(i).not.toBe(-1)
        expect(args[i + 1]).toBe('json')
        expect(args.includes('-add-options')).toBe(false)
      })

      it('specifies tags correctly', () => {
        editor.setCursorBufferPosition([4, 6])
        const args = gomodifytags.buildArgs(editor, options, 'Add')
        const i = args.indexOf('-add-tags')
        expect(i).not.toBe(-1)
        expect(args[i + 1]).toBe('xml,bson')
      })

      it('uses the -offset flag if there is no selection', () => {
        editor.setCursorBufferPosition([4, 6])
        const args = gomodifytags.buildArgs(editor, options, 'Add')
        expect(args.length).toBeGreaterThan(3)
        expect(args[2]).toBe('-offset')
        expect(args[3]).toBe(51)
      })

      it('uses the -line flag when there is a selection', () => {
        editor.setSelectedBufferRange([[3, 2], [4, 6]])
        const args = gomodifytags.buildArgs(editor, options, 'Add')
        expect(args.length).toBeGreaterThan(3)
        expect(args[2]).toBe('-line')
        expect(args[3]).toBe('4,5')
      })

      it('uses the -modified flag when the buffer is modified', () => {
        editor.setCursorBufferPosition([4, 6])
        editor.insertNewlineBelow()
        expect(editor.isModified()).toBe(true)
        const args = gomodifytags.buildArgs(editor, options, 'Add')
        expect(args.includes('-modified')).toBe(true)
      })

      it('uses the -transform flag when camel case is specified', () => {
        options.useSnakeCase = false
        editor.setCursorBufferPosition([4, 6])
        const args = gomodifytags.buildArgs(editor, options, 'Add')
        const i = args.indexOf('-transform')
        expect(i).not.toBe(-1)
        expect(args[i + 1]).toBe('camelcase')
      })

      it('uses the -sort flag when the sort option is enabled', () => {
        options.sortTags = true
        editor.setCursorBufferPosition([4, 6])
        const args = gomodifytags.buildArgs(editor, options, 'Add')
        expect(args.includes('-sort')).toBe(true)
      })

      it('includes the -add-options flag if options were specified for add', () => {
        editor.setCursorBufferPosition([4, 6])
        options.tags = [{tag: 'bson', option: 'omitempty'}, {tag: 'xml', option: 'foo'}]
        const args = gomodifytags.buildArgs(editor, options, 'Add')
        let i = args.indexOf('-add-tags')
        expect(i).not.toBe(-1)
        expect(args[i + 1]).toBe('bson,xml')

        i = args.indexOf('-add-options')
        expect(i).not.toBe(-1)
        expect(args[i + 1]).toBe('bson=omitempty,xml=foo')
      })

      it('uses the -clear-tags flag if no tags are specified for remove', () => {
        editor.setCursorBufferPosition([4, 6])
        options.tags = []
        const args = gomodifytags.buildArgs(editor, options, 'Remove')
        expect(args.includes('-clear-tags')).toBe(true)
      })

      it ('includes the -remove-tags flag if no options are specified for remove', () => {
        editor.setCursorBufferPosition([4, 6])
        options.tags = [{tag: 'json', option: null}]
        const args = gomodifytags.buildArgs(editor, options, 'Remove')
        expect(args.includes('-remove-options')).toBe(false)
        const i = args.indexOf('-remove-tags')
        expect(i).not.toBe(-1)
        expect(args[i + 1]).toBe('json')
      })

      it ('includes the -remove-options flag if options are specified for remove', () => {
        editor.setCursorBufferPosition([4, 6])
        options.tags = [{tag: 'json', option: 'omitempty'}]
        const args = gomodifytags.buildArgs(editor, options, 'Remove')
        expect(args.includes('-remove-tags')).toBe(false)
        const i = args.indexOf('-remove-options')
        expect(i).not.toBe(-1)
        expect(args[i + 1]).toBe('json=omitempty')
      })
    })
  })
})
