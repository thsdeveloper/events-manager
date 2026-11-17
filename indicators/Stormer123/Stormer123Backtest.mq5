#property copyright "Implementacao independente | exclusivo para backtests"
#property version "1.20"
#property description "Stormer 123: uma posicao por vez, somente Strategy Tester."
#include <Trade/Trade.mqh>
#include "Stormer123EARules.mqh"
enum StopEA123 { STOP_C2=0,STOP_C3=1 };
enum TargetEA123 { ALVO_RISCO=0,ALVO_AMPLITUDE=1 };
enum SideEA123 { COMPRA_E_VENDA=0,SOMENTE_COMPRA=1,SOMENTE_VENDA=2 };
enum ProtectionEA123 { STOP_FIXO=0,BREAKEVEN=1,TRAILING_R=2 };
input group "01 | Operacional 123"
input SideEA123 Direcao=COMPRA_E_VENDA;
input bool FiltroTendencia=true; // Alinhamento e inclinacao no candle fechado
input int MediaCurta=8;
input int MediaLonga=80;
input bool ApenasInsideBar=false;
input StopEA123 TipoStop=STOP_C2;
input TargetEA123 TipoAlvo=ALVO_RISCO;
input double FatorAlvo=1.61;
input int MargemTicks=1;
input int ValidadeBarras=1;
input group "02 | Execucao simulada"
input double VolumeFixo=1.0; // Contratos/lotes conforme o simbolo
input double MaxSpreadTicks=0; // Zero desliga o filtro
input int DesvioTicks=2; // Tolerancia enviada ao MT5; depende do modo de execucao
input ulong MagicNumber=1238001;
input bool LogDetalhado=true;
input group "03 | Gestao do stop - comparar separadamente"
input ProtectionEA123 ModoGestao=STOP_FIXO;
input double AtivarProtecaoR=1.0; // R medido da entrada executada ao stop ORIGINAL
input int OffsetBreakevenTicks=1; // Nao garante empate depois de custos
input double DistanciaTrailingR=0.75; // Distancia do melhor Bid/Ask apos ativar

CTrade trade;
int fastHandle=INVALID_HANDLE,slowHandle=INVALID_HANDLE;
double fastMA[],slowMA[],tradeVolume=0,tickSize=0;
MqlRates rates[];
Plan123 pendingPlan={0,0,0,0,0};
bool pending=false,wasPosition=false,inFlight=false;
datetime pendingC3=0,lastBar=0,lastExitTime=0,lastEntryTime=0;
ulong submittedOrder=0;
int signalsFound=0,requests=0,rejected=0;
string eaStatus="Aguardando historico";
Protection123 protection={0,0,0,0};
ulong protectionId=0;
datetime retryProtectionAfter=0;
int protectionChanges=0,protectionRejected=0;

void Log(string message) { if(LogDetalhado) Print("S123 | ",message); }
string PriceEA(double value) { return DoubleToString(value,_Digits); }
bool PositionExists() {
 for(int i=PositionsTotal()-1;i>=0;i--) {
  if(PositionGetTicket(i)>0 && PositionGetString(POSITION_SYMBOL)==_Symbol) return true;
 }
 return false;
}
bool WorkingOrderExists() {
 for(int i=OrdersTotal()-1;i>=0;i--) {
  if(OrderGetTicket(i)>0 && OrderGetString(ORDER_SYMBOL)==_Symbol) return true;
 }
 return false;
}
void Display() {
 if(!MQLInfoInteger(MQL_VISUAL_MODE)) return;
 string text="STORMER 123 | BACKTEST 1.20\n"+_Symbol+" / "+EnumToString(_Period)+
   " | MME "+IntegerToString(MediaCurta)+" + "+IntegerToString(MediaLonga)+
   "\n"+eaStatus+"\nUma operacao por vez | Volume "+DoubleToString(tradeVolume,8);
 if(pending) text+="\nEntrada "+PriceEA(pendingPlan.entry)+" | Stop "+PriceEA(pendingPlan.stop)+" | Alvo "+PriceEA(pendingPlan.target);
 text+="\nGestao: "+EnumToString(ModoGestao)+" | Ativacao "+DoubleToString(AtivarProtecaoR,2)+"R";
 text+="\nFiltro MMEs: "+(FiltroTendencia?"alinhamento + inclinacao":"desligado");
 Comment(text);
}
bool ReadyOrderState() {
 if(!inFlight) return true;
 if(PositionExists()) { inFlight=false; return true; }
 if(WorkingOrderExists()) return false;
 if(submittedOrder==0 || !HistoryOrderSelect(submittedOrder)) return false;
 ENUM_ORDER_STATE state=(ENUM_ORDER_STATE)HistoryOrderGetInteger(submittedOrder,ORDER_STATE);
 if(state==ORDER_STATE_FILLED || state==ORDER_STATE_CANCELED || state==ORDER_STATE_REJECTED || state==ORDER_STATE_EXPIRED) {
  inFlight=false;
  // A filled request may have opened and closed between ticks. Never reuse its C3.
  if(state==ORDER_STATE_FILLED && lastExitTime<lastEntryTime) lastExitTime=TimeCurrent();
  return true;
 }
 return false;
}
bool BuildCandidate(Plan123 &plan) {
 Bar123 a={rates[3].high,rates[3].low},b={rates[2].high,rates[2].low},c={rates[1].high,rates[1].low};
 int side=Pattern123(a,b,c);
 if(side==0 || (Direcao==SOMENTE_COMPRA && side<0) || (Direcao==SOMENTE_VENDA && side>0)) return false;
 if(FiltroTendencia && !Trend123(side,fastMA[1],fastMA[2],slowMA[1],slowMA[2])) return false;
 if(ApenasInsideBar && !(c.high<b.high && c.low>b.low)) return false;
 plan=Levels123(side,a,b,c,tickSize,TipoStop,TipoAlvo,FatorAlvo,MargemTicks);
 return side*(plan.target-plan.entry)>0;
}
void SubmitEntry(const MqlTick &quote) {
 // Consume the virtual trigger exactly once, including rejection; no retry storm.
 pending=false;
 if(!MQLInfoInteger(MQL_TESTER) || PositionExists() || WorkingOrderExists() || inFlight) return;
 double minimumDistance=(double)SymbolInfoInteger(_Symbol,SYMBOL_TRADE_STOPS_LEVEL)*_Point;
 if(!MarketStops123(pendingPlan,quote.bid,quote.ask,minimumDistance)) {
  eaStatus="Sinal descartado: distancia de stops"; rejected++; Log(eaStatus); return;
 }
 double margin=0;
 ENUM_ORDER_TYPE type=pendingPlan.side==1?ORDER_TYPE_BUY:ORDER_TYPE_SELL;
 double marketPrice=pendingPlan.side==1?quote.ask:quote.bid;
 if(!OrderCalcMargin(type,_Symbol,tradeVolume,marketPrice,margin) || margin>AccountInfoDouble(ACCOUNT_MARGIN_FREE)) {
  eaStatus="Sinal descartado: margem insuficiente/indisponivel"; rejected++; Log(eaStatus); return;
 }
 requests++;
 bool sent=pendingPlan.side==1?
  trade.Buy(tradeVolume,_Symbol,0,pendingPlan.stop,pendingPlan.target,"Stormer123 compra"):
  trade.Sell(tradeVolume,_Symbol,0,pendingPlan.stop,pendingPlan.target,"Stormer123 venda");
 uint code=trade.ResultRetcode();
 if(sent && (code==TRADE_RETCODE_DONE || code==TRADE_RETCODE_DONE_PARTIAL || code==TRADE_RETCODE_PLACED)) {
  submittedOrder=trade.ResultOrder(); inFlight=true; lastEntryTime=TimeCurrent();
  eaStatus="Entrada enviada | aguardando execucao";
  Log(eaStatus+" | ordem "+(string)submittedOrder+" | preco "+PriceEA(trade.ResultPrice()));
 } else {
  rejected++; eaStatus="Ordem rejeitada: "+trade.ResultRetcodeDescription();
  Log(eaStatus+" | codigo "+IntegerToString((int)code));
 }
}
void ManageProtection(const MqlTick &quote) {
 if(!MQLInfoInteger(MQL_TESTER) || ModoGestao==STOP_FIXO || WorkingOrderExists()) return;
 for(int i=PositionsTotal()-1;i>=0;i--) {
  ulong ticket=PositionGetTicket(i);
  if(ticket==0 || PositionGetString(POSITION_SYMBOL)!=_Symbol || (ulong)PositionGetInteger(POSITION_MAGIC)!=MagicNumber) continue;
  ulong identifier=(ulong)PositionGetInteger(POSITION_IDENTIFIER);
  double currentSL=PositionGetDouble(POSITION_SL),tp=PositionGetDouble(POSITION_TP);
  if(identifier!=protectionId) {
   // Wait for all entry fills before taking this immutable snapshot.
   protectionId=identifier; retryProtectionAfter=0;
   protection.side=PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY?1:-1;
   protection.entry=PositionGetDouble(POSITION_PRICE_OPEN);
   protection.risk=currentSL>0?protection.side*(protection.entry-currentSL):0;
   protection.best=protection.entry;
   Log("Protecao inicial | entrada "+PriceEA(protection.entry)+" | R original "+PriceEA(protection.risk));
  }
  double stops=(double)SymbolInfoInteger(_Symbol,SYMBOL_TRADE_STOPS_LEVEL)*_Point;
  double freeze=(double)SymbolInfoInteger(_Symbol,SYMBOL_TRADE_FREEZE_LEVEL)*_Point;
  // Always observe favorable prices, even during a rejected-request cooldown.
  double proposed=ProtectStop123(protection,ModoGestao,currentSL,tp,quote.bid,quote.ask,tickSize,AtivarProtecaoR,OffsetBreakevenTicks,DistanciaTrailingR,stops,freeze);
  if(MathAbs(proposed-currentSL)<tickSize*0.5 || TimeCurrent()<retryProtectionAfter) return;
  bool sent=trade.PositionModify(ticket,NormalizeDouble(proposed,_Digits),tp);
  uint code=trade.ResultRetcode();
  if(sent && (code==TRADE_RETCODE_DONE || code==TRADE_RETCODE_NO_CHANGES)) {
   if(code==TRADE_RETCODE_DONE) {
    protectionChanges++;
    Log(EnumToString(ModoGestao)+" | SL "+PriceEA(currentSL)+" -> "+PriceEA(proposed)+" | TP mantido "+PriceEA(tp));
   }
   retryProtectionAfter=0;
  } else {
   protectionRejected++;
   retryProtectionAfter=TimeCurrent()+1;
   Log("Modificacao de SL recusada: "+trade.ResultRetcodeDescription()+" | nova tentativa em tick posterior");
  }
  return; // The strategy admits a single position; never modify another ticket.
 }
}
int OnInit() {
 // This artifact is deliberately a tester-only EA, not a live trading release.
 if(!MQLInfoInteger(MQL_TESTER)) { Print("S123: execute exclusivamente no Testador de Estrategias (Ctrl+R)."); return INIT_FAILED; }
 if(MediaCurta<1 || MediaLonga<=MediaCurta || FatorAlvo<=0 || MargemTicks<1 || ValidadeBarras<1 ||
    VolumeFixo<=0 || MaxSpreadTicks<0 || DesvioTicks<0 || MagicNumber==0 || AtivarProtecaoR<=0 || OffsetBreakevenTicks<0 || DistanciaTrailingR<=0 || ModoGestao<STOP_FIXO || ModoGestao>TRAILING_R) return INIT_PARAMETERS_INCORRECT;
 tickSize=SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_SIZE);
 tradeVolume=Volume123(VolumeFixo,SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MIN),SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MAX),SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_STEP));
 if(tickSize<=0 || _Point<=0 || tradeVolume<=0) {Print("S123: volume/tick invalido para este simbolo.");return INIT_PARAMETERS_INCORRECT;}
 fastHandle=iMA(_Symbol,_Period,MediaCurta,0,MODE_EMA,PRICE_CLOSE);
 slowHandle=iMA(_Symbol,_Period,MediaLonga,0,MODE_EMA,PRICE_CLOSE);
 if(fastHandle==INVALID_HANDLE || slowHandle==INVALID_HANDLE) return INIT_FAILED;
 ArraySetAsSeries(rates,true); ArraySetAsSeries(fastMA,true); ArraySetAsSeries(slowMA,true);
 trade.SetExpertMagicNumber(MagicNumber);
 trade.SetAsyncMode(false);
 trade.SetDeviationInPoints((ulong)MathCeil(DesvioTicks*tickSize/_Point));
 if(!trade.SetTypeFillingBySymbol(_Symbol)) {Print("S123: nao foi possivel configurar filling do simbolo.");return INIT_FAILED;}
 Log("Inicio | volume "+DoubleToString(tradeVolume,8)+" | tick "+PriceEA(tickSize)+" | somente tester");
 if(MQLInfoInteger(MQL_VISUAL_MODE)) {
  ChartSetInteger(0,CHART_MODE,CHART_CANDLES);
  ChartSetInteger(0,CHART_COLOR_CANDLE_BULL,clrLimeGreen); ChartSetInteger(0,CHART_COLOR_CHART_UP,clrLimeGreen);
  ChartSetInteger(0,CHART_COLOR_CANDLE_BEAR,clrRed); ChartSetInteger(0,CHART_COLOR_CHART_DOWN,clrRed);
 }
 return INIT_SUCCEEDED;
}
void OnTick() {
 if(!MQLInfoInteger(MQL_TESTER)) return;
 if(CopyRates(_Symbol,_Period,0,4,rates)!=4) return;
 MqlTick quote;
 if(!SymbolInfoTick(_Symbol,quote)) return;
 bool position=PositionExists();
 if(position) {
  wasPosition=true; inFlight=false; pending=false; lastBar=rates[0].time;
  ManageProtection(quote);
  eaStatus="Operacao ativa | novos sinais BLOQUEADOS"; Display(); return;
 }
 if(wasPosition) {
  wasPosition=false; pending=false;
  // Transaction notifications normally supply the exact exit time first.
  if(lastExitTime<lastEntryTime) lastExitTime=TimeCurrent();
  eaStatus="Operacao encerrada | aguardando novo padrao";
 }
 if(!ReadyOrderState() || WorkingOrderExists()) {
  pending=false; lastBar=rates[0].time;
  eaStatus="Ordem em processamento | novos sinais BLOQUEADOS"; Display(); return;
 }
 bool newBar=rates[0].time!=lastBar;
 if(newBar) {
  if(BarsCalculated(fastHandle)<MediaLonga+4 || BarsCalculated(slowHandle)<MediaLonga+4 ||
     CopyBuffer(fastHandle,0,0,3,fastMA)!=3 || CopyBuffer(slowHandle,0,0,3,slowMA)!=3) return;
  lastBar=rates[0].time;
  if(OfferAfterExit123(false,false,(long)lastExitTime,(long)rates[0].time)) {
   Plan123 candidate={0,0,0,0,0};
   if(BuildCandidate(candidate)) {
    if(pending) Log("Sinal pendente substituido antes da entrada");
    pendingPlan=candidate; pendingC3=rates[1].time; pending=true; signalsFound++;
    eaStatus=(candidate.side==1?"COMPRA":"VENDA")+" | aguardando gatilho";
    Log(eaStatus+" | C3 "+TimeToString(pendingC3,TIME_DATE|TIME_MINUTES)+" | E "+PriceEA(candidate.entry)+" | SL "+PriceEA(candidate.stop)+" | TP "+PriceEA(candidate.target));
   }
  }
 }
 if(pending) {
  int age=iBarShift(_Symbol,_Period,pendingC3,true);
  int action=Trigger123(pendingPlan,quote.bid,quote.ask,age,ValidadeBarras,tickSize,MaxSpreadTicks);
  if(action==1) SubmitEntry(quote);
  else if(action==2 || action==3 || action==4) {
   pending=false;
   eaStatus=action==2?"Invalidado antes da entrada":(action==3?"Sinal expirado":"Gap alem do alvo: sinal descartado");
   Log(eaStatus);
  } else if(action==5) eaStatus="Spread acima do limite | aguardando";
 }
 Display();
}
void OnTradeTransaction(const MqlTradeTransaction &trans,const MqlTradeRequest &request,const MqlTradeResult &result) {
 if(trans.type!=TRADE_TRANSACTION_DEAL_ADD || !HistoryDealSelect(trans.deal)) return;
 if(HistoryDealGetString(trans.deal,DEAL_SYMBOL)!=_Symbol || (ulong)HistoryDealGetInteger(trans.deal,DEAL_MAGIC)!=MagicNumber) return;
 ENUM_DEAL_ENTRY entry=(ENUM_DEAL_ENTRY)HistoryDealGetInteger(trans.deal,DEAL_ENTRY);
 if(entry==DEAL_ENTRY_IN) {
  lastEntryTime=(datetime)HistoryDealGetInteger(trans.deal,DEAL_TIME);
  Log("Execucao confirmada | preco "+PriceEA(HistoryDealGetDouble(trans.deal,DEAL_PRICE)));
 }
 if(entry==DEAL_ENTRY_OUT || entry==DEAL_ENTRY_OUT_BY || entry==DEAL_ENTRY_INOUT) {
  lastExitTime=(datetime)HistoryDealGetInteger(trans.deal,DEAL_TIME);
  Log("Saida confirmada | resultado bruto "+DoubleToString(HistoryDealGetDouble(trans.deal,DEAL_PROFIT),2)+
      " | motivo "+EnumToString((ENUM_DEAL_REASON)HistoryDealGetInteger(trans.deal,DEAL_REASON)));
 }
}
void OnDeinit(const int reason) {
 if(fastHandle!=INVALID_HANDLE) IndicatorRelease(fastHandle);
 if(slowHandle!=INVALID_HANDLE) IndicatorRelease(slowHandle);
 if(MQLInfoInteger(MQL_VISUAL_MODE)) Comment("");
 PrintFormat("S123 resumo: %d sinais, %d ordens, %d rejeicoes de entrada; %d stops modificados, %d modificacoes recusadas.",signalsFound,requests,rejected,protectionChanges,protectionRejected);
}



