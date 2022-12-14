import { errorBuilder } from "./RCError.ts"
import { isDigital, isLetter } from "./Util.ts"
export enum TokenType {
  OP,
  Literal,
  Variable
}

export interface Token {
  id : string,
  type : number,
  position : number
}

export function createToken(Id : string, type : number, position : number) : Token {
  return {
    id : Id,
    type,
    position
  }
}

const state : Record<string,symbol> = {
  start : Symbol('0'),
  letter : Symbol('1'),
  number : Symbol('3'),
  openParenthesis : Symbol('5'),
  closingParenthesis : Symbol('6'),
  multiply : Symbol('7'),
  sub : Symbol('8'),
  power : Symbol('9'),
  range : Symbol('10'),
  add : Symbol('11'),
  divide : Symbol('12'),
  double : Symbol('13'),
  err : Symbol('error')
}

function transport(inputChar : string, currentState : symbol) : symbol{
  if(currentState == state.start){
    switch(inputChar){
      case '(':
        return state.openParenthesis
      case ')':
        return state.closingParenthesis
      case '*':
        return state.multiply
      case '-':
        return state.sub
      case '^':
        return state.power
      case '~':
        return state.range
      case '+':
        return state.add
      case '/':
        return state.divide
      default :
        if(isLetter(inputChar))
          return state.letter
        else if(isDigital(inputChar))
          return state.number
        else return state.err
    }
  }else if(currentState == state.number){
    return isDigital(inputChar) ? state.number : inputChar == '.' ? state.double : state.err
  } else if(currentState == state.letter){
    return isLetter(inputChar) ? state.letter : state.err
  } else if(currentState == state.double) {
    return isDigital(inputChar) ? state.double : state.err
  } else 
    throw new Error('transport err')
}

function isOp(str: string): boolean {
  return /[\*|\^|+|\-|=|/|~/(|)]/.test(str)
}

export interface Lexer {
  next() : Token 
  peek(index?:number) : Token | undefined
  hasNext() : boolean
  source : string
  varsExport(): Map<string,Array<number>>
}

export interface LexerFactory{
  create() : Lexer
}

class LexerImpl implements Lexer{
  readonly source : string
  private position  = 0
  private state : symbol = state.start
  private buffer : Array<Token> = []

  constructor(source : string){
    this.source = source
  }
varsExport(): Map<string,number[]> {
  throw new Error("Method not implemented.");
}

  fetchToken() : Token{
    let identifier = undefined
    this.ignoreSpace()
    let move = this.position
    if(move >= this.source.length)
      throw new Error(`has no token!`)
    let recordPosition = this.position
    let recordState = this.state
    while(move < this.source.length){
      const currentChar = this.source[move]
      const nextState = transport(currentChar, this.state)
      if(nextState == state.err){
        identifier = this.getIdentifier(this.position, move)
        recordPosition = this.position
        recordState = this.state
        this.position = move
        this.state = state.start
        return this.identifier2token( identifier, recordPosition,  recordState)
      }else if(nextState == state.letter || nextState == state.number || nextState == state.double) {
        this.state = nextState
        move++
      }else {
        identifier = this.getIdentifier(this.position, move + 1)
        recordPosition = this.position
        this.position = move + 1
        this.state = state.start
        return this.identifier2token( identifier, recordPosition,  nextState)
      }
    }
    recordPosition = this.position
    recordState = this.state
    identifier = this.getIdentifier(this.position, move)
    this.position = move
    this.state = state.start
    return this.identifier2token( identifier, recordPosition,  recordState)

  }

  identifier2token(id : string, position : number, st : symbol) : Token{
    if(st == state.number || st == state.double)
      return createToken(id,TokenType.Literal, position)
    else if(st == state.letter)
      return createToken(id,TokenType.Variable, position)
    else return createToken(id, TokenType.OP, position)
  }

  getIdentifier(from : number, to : number) : string{
    return this.source.substring(from,to)
  }

  ignoreSpace(){
    const source = this.source
    while(
      source.length > this.position && 
      source[this.position] === ' '
    ) this.position++
  }

  next(): Token {
    if(this.buffer.length == 0 && !this.hasNext()){
      throw new Error('eof')
    }
    if(this.buffer.length == 0)
      this.buffer = [this.fetchToken()]
    return this.buffer.splice(0, 1)[0]
  }

  peek(index?: number|undefined): Token | undefined {
    
    index = typeof index == 'undefined' ? 0 : index
    if(index < this.buffer.length)
      return this.buffer[index]
    let sizeOfToken2fetch = index - this.buffer.length + 1
    while(sizeOfToken2fetch > 0 && this.hasNext()){
      this.buffer.push(this.fetchToken())
      sizeOfToken2fetch--
    }
    return sizeOfToken2fetch > 0 ? undefined : this.buffer[index]
  }

  hasNext(): boolean {
    this.ignoreSpace()
    return this.buffer.length > 0 || this.position < this.source.length
  }
}

export class LexerFactoryImpl implements LexerFactory {
  readonly source : string
  constructor(_s : string){
    this.source = _s
  }

  create(): Lexer {
    return new LexerImpl2(this.source)
  }

}

class LexerImpl2 implements Lexer {

  readonly source : string
  private position  = 0
  private buffer : Array<Token> = []
  private vars : Map<string,Array<number>> 

  constructor(source : string){
    this.source = source
    this.vars = new Map()
  }
  varsExport(): Map<string,number[]> {
    return this.vars
  }

  next(): Token {
    if(this.buffer.length == 0 && !this.hasNext()){
      throw new Error('eof')
    }
    if(this.buffer.length == 0)
      this.buffer = [this.fetchToken()]
    return this.buffer.splice(0, 1)[0]
  }

  peek(index?: number|undefined): Token|undefined {
  
    index = typeof index == 'undefined' ? 0 : index
    if(index < this.buffer.length)
      return this.buffer[index]
    let sizeOfToken2fetch = index - this.buffer.length + 1
    while(sizeOfToken2fetch > 0 && this.hasNext()){
      this.buffer.push(this.fetchToken())
      sizeOfToken2fetch--
    }
    return sizeOfToken2fetch > 0 ? undefined : this.buffer[index]
  }
  hasNext(): boolean {
    this.ignoreSpace()
    return this.buffer.length > 0 || this.position < this.source.length
  }

  fetchToken() : Token {
    this.ignoreSpace()
    const c = this.source[this.position]
    if(isDigital(c)){
      return this.handleDigital()
    }else if(isLetter(c)){
      return this.handleIdentifier()
    }else if(isOp(c)){
      return this.handleOp(c)
    }else{
      const e = errorBuilder()
      .source(this.source)
      .message(`??????????????????<${JSON.stringify(c)}>`)
      .location(this.position)
      .build()
      throw e
    }
  }

  private handleOp(c : string){
    switch(c){
      case "+":
      case "-":
      case "*":
      case "/":
        if(this.position+1 < this.source.length && this.source[this.position + 1] == "="){
          const recordPos = this.position
          this.position += 2
          return createToken(this.source.substring(recordPos, recordPos + 2), TokenType.OP, recordPos)
        }
        return createToken(this.source[this.position], TokenType.OP, this.position++)
      default:
        return createToken(this.source[this.position], TokenType.OP, this.position++)
    }
  }

  private handleIdentifier() : Token {
    const recordPos = this.position
    while(this.position < this.source.length && isLetter(this.source[this.position]))
      this.position++
    const id = this.source.substring(recordPos, this.position)
    // this.vars.set(id, recordPos)
    if(!this.vars.has(id)){
      this.vars.set(id,[])
    }
    this.vars.get(id)?.push(recordPos)
    return createToken(id, TokenType.Variable, recordPos)
  }

  private ignoreSpace(){
    const source = this.source
    while(
      source.length > this.position && 
      /[ |\r|\n]/.test(source[this.position])
    ) this.position++
  }

  private handleDigital(): Token {
    const recordPos = this.position
    while(this.position < this.source.length && isDigital(this.source[this.position])){
      this.position++;
    }
    if(this.position >= this.source.length || this.source[this.position] != "."){
      return createToken(this.source.substring(recordPos, this.position),TokenType.Literal, recordPos)
    }
    this.position++
    while(this.position < this.source.length && isDigital(this.source[this.position])){
      this.position++
    }

    return createToken(this.source.substring(recordPos, this.position), TokenType.Literal, recordPos)
  }
}