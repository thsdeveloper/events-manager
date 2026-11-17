#property copyright "Implementacao independente; sem afiliacao ao Stormer"
#property version "1.30"
#property description "123 visual | historico GAIN/LOSS | card interativo"
#property indicator_chart_window
#property indicator_buffers 2
#property indicator_plots 2
#property indicator_type1 DRAW_LINE
#property indicator_color1 clrDeepSkyBlue
#property indicator_label1 "MME curta"
#property indicator_type2 DRAW_LINE
#property indicator_color2 clrMediumPurple
#property indicator_width2 3
#property indicator_label2 "MME longa"
#include "Stormer123Core.mqh"
enum Stop123 { STOP_C2=0, STOP_C3=1 };
enum Target123 { ALVO_RISCO=0, ALVO_AMPLITUDE=1 };
input group "01 | Regras do operacional"
input bool FiltroTendencia=true; // Alinhamento e inclinacao no candle fechado
input int MediaCurta=8;
input int MediaLonga=80;
input bool ApenasInsideBar=false;
input Stop123 TipoStop=STOP_C2;
input Target123 TipoAlvo=ALVO_RISCO;
input double FatorAlvo=1.61;
input int MargemTicks=1;
input int ValidadeBarras=1;
input group "02 | Visual e controles iniciais"
input int HistoricoBarras=1000;
input int PadroesVisiveis=12; // Quantidade total: atual + historicos
input int ExtensaoNiveis=12;
input bool MostrarHistorico=true;
input bool MostrarAtual=true; // Mais recente, mesmo se encerrado
input bool MostrarMedias=true;
input bool MostrarNumeracao=false; // Ative no card para estudar C1/C2/C3
input bool MostrarResultados=true;
input bool MostrarNiveis=true; // Niveis do sinal mais recente
input bool MostrarParcial=true;
input bool ColorirCandles=true; // Alta verde, baixa vermelha
input color CorCompra=clrLimeGreen;
input color CorVenda=clrRed;
input color CorEntrada=clrDeepSkyBlue;
input color CorAlvo=clrTurquoise;
input color CorMediaCurta=clrDeepSkyBlue;
input color CorMediaLonga=clrMediumPurple;
input int EspessuraMediaLonga=3;
input group "03 | Avisos"
input bool Alertas=false;
input bool Push=false;

// Bitmask: historico=1, atual=2, medias=4, numeracao=8, resultados=16, niveis=32.
int viewMask=0,hf=INVALID_HANDLE,hs=INVALID_HANDLE,hr=INVALID_HANDLE;
double Fast[],Slow[],f[],s[],rsi[];
MqlRates bars[];
struct Signal123 { int shift; Plan123 plan; Trace123 trace; };
Signal123 signals[];
string prefix;
datetime lastBar=0;
// Keep the replay origin fixed while attached: active trades cannot fall out of a rolling window.
datetime windowStart=0;
long oldBull,oldBear,oldUp,oldDown,oldMode;
bool chartStyled=false;
int tagX[],tagY[],tagW[];

string Price(double value) { return DoubleToString(value,_Digits); }
string Direction(int side) { return side==1?"COMPRA":"VENDA"; }
color ResultColor(int state) {
 if(state==3) return CorCompra;
 if(state==2) return CorVenda;
 if(state==6) return clrGold;
 return clrSilver;
}
string ResultCaption(const Signal123 &sig) {
 string text=Outcome123(sig.trace.state);
 if(sig.trace.state==3) text+=" +"+DoubleToString(Return123(3,sig.plan),2)+"R";
 if(sig.trace.state==2) text+=" -1R";
 return text;
}
string Details(const Signal123 &sig) {
 return Direction(sig.plan.side)+" | C3 "+TimeToString(bars[sig.shift].time,TIME_DATE|TIME_MINUTES)+
        "\n"+ResultCaption(sig)+" (teorico)\nEntrada "+Price(sig.plan.entry)+
        " | Stop "+Price(sig.plan.stop)+" | Alvo "+Price(sig.plan.target);
}
void Style(string name,color ink,string tooltip="") {
 ObjectSetInteger(0,name,OBJPROP_COLOR,ink);
 ObjectSetInteger(0,name,OBJPROP_SELECTABLE,false);
 ObjectSetInteger(0,name,OBJPROP_HIDDEN,true);
 ObjectSetString(0,name,OBJPROP_TOOLTIP,tooltip==""?"\n":tooltip);
}
void Label(string key,int x,int y,string value,color ink,int size=10) {
 string name=prefix+key;
 if(ObjectFind(0,name)<0) ObjectCreate(0,name,OBJ_LABEL,0,0,0);
 ObjectSetInteger(0,name,OBJPROP_CORNER,CORNER_LEFT_UPPER);
 ObjectSetInteger(0,name,OBJPROP_XDISTANCE,x);
 ObjectSetInteger(0,name,OBJPROP_YDISTANCE,y);
 ObjectSetInteger(0,name,OBJPROP_FONTSIZE,size);
 ObjectSetString(0,name,OBJPROP_FONT,"Segoe UI");
 ObjectSetString(0,name,OBJPROP_TEXT,value);
 Style(name,ink);
}
void TextAt(string key,datetime when,double price,string value,color ink,string tooltip="") {
 string name=prefix+key;
 ObjectCreate(0,name,OBJ_TEXT,0,when,price);
 ObjectSetString(0,name,OBJPROP_TEXT,value);
 ObjectSetString(0,name,OBJPROP_FONT,"Segoe UI Semibold");
 ObjectSetInteger(0,name,OBJPROP_FONTSIZE,10);
 ObjectSetInteger(0,name,OBJPROP_ANCHOR,ANCHOR_LEFT_LOWER);
 Style(name,ink,tooltip);
}
void Line(string key,datetime start,double p1,datetime end,double p2,color ink,ENUM_LINE_STYLE style,string tooltip="") {
 string name=prefix+key;
 ObjectCreate(0,name,OBJ_TREND,0,start,p1,end,p2);
 ObjectSetInteger(0,name,OBJPROP_RAY_RIGHT,false);
 ObjectSetInteger(0,name,OBJPROP_RAY_LEFT,false);
 ObjectSetInteger(0,name,OBJPROP_STYLE,style);
 Style(name,ink,tooltip);
}
void Marker(string key,datetime when,double price,int code,color ink,string tooltip) {
 string name=prefix+key;
 ObjectCreate(0,name,OBJ_ARROW,0,when,price);
 ObjectSetInteger(0,name,OBJPROP_ARROWCODE,code);
 ObjectSetInteger(0,name,OBJPROP_WIDTH,2);
 Style(name,ink,tooltip);
}
void Button(int flag,int x,int y,string caption) {
 string name=prefix+"btn"+IntegerToString(flag);
 bool enabled=(viewMask&flag)!=0;
 if(ObjectFind(0,name)<0) ObjectCreate(0,name,OBJ_BUTTON,0,0,0);
 ObjectSetInteger(0,name,OBJPROP_XDISTANCE,x);
 ObjectSetInteger(0,name,OBJPROP_YDISTANCE,y);
 ObjectSetInteger(0,name,OBJPROP_XSIZE,122);
 ObjectSetInteger(0,name,OBJPROP_YSIZE,25);
 ObjectSetInteger(0,name,OBJPROP_FONTSIZE,9);
 ObjectSetInteger(0,name,OBJPROP_BGCOLOR,enabled?C'30,58,75':C'30,34,44');
 ObjectSetInteger(0,name,OBJPROP_BORDER_COLOR,enabled?C'56,140,164':C'55,65,81');
 ObjectSetInteger(0,name,OBJPROP_ZORDER,20);
 ObjectSetInteger(0,name,OBJPROP_STATE,false);
 ObjectSetString(0,name,OBJPROP_FONT,"Segoe UI");
 ObjectSetString(0,name,OBJPROP_TEXT,caption+(enabled?" ON":" OFF"));
 Style(name,enabled?clrWhite:clrSilver,"Clique para mostrar / ocultar "+caption);
}
void Panel() {
 string name=prefix+"panel";
 if(ObjectFind(0,name)<0) ObjectCreate(0,name,OBJ_RECTANGLE_LABEL,0,0,0);
 ObjectSetInteger(0,name,OBJPROP_XDISTANCE,14);
 ObjectSetInteger(0,name,OBJPROP_YDISTANCE,28);
 ObjectSetInteger(0,name,OBJPROP_XSIZE,414);
 ObjectSetInteger(0,name,OBJPROP_YSIZE,334);
 ObjectSetInteger(0,name,OBJPROP_BGCOLOR,C'17,24,39');
 ObjectSetInteger(0,name,OBJPROP_BORDER_TYPE,BORDER_FLAT);
 Style(name,C'51,65,85');
 Label("title",30,42,"S T O R M E R   /   1 2 3",clrWhite,13);
 Label("market",30,69,_Symbol+"   /   "+EnumToString(_Period)+"   /   v1.30",clrSilver,9);
 Label("fastLegend",30,91,"--  MME "+IntegerToString(MediaCurta)+"  curta",CorMediaCurta,10);
 Label("slowLegend",213,91,"===  MME "+IntegerToString(MediaLonga)+"  longa",CorMediaLonga,10);
 Button(1,30,260,"Historico"); Button(2,160,260,"Sinal atual"); Button(4,290,260,"Medias");
 Button(8,30,292,"Numeracao"); Button(16,160,292,"Resultados"); Button(32,290,292,"Niveis");
 Label("hint",30,331,FiltroTendencia?"MMEs: alinhamento + inclinacao | 1 operacao":"Filtro de MMEs OFF | 1 operacao por vez",clrSilver,9);
 if(ArraySize(signals)==0) {
  Label("status",30,122,"AGUARDANDO PADRAO FECHADO",clrSilver);
  Label("prices",30,151,"Nenhum sinal nos dados carregados",clrSilver);
  Label("risk",30,177,"Filtro de tendencia: "+(FiltroTendencia?"ON":"OFF"),clrSilver);
  Label("when",30,203,"Carregue mais candles se necessario",clrSilver,9);
 } else {
  Signal123 sig=signals[0];
  color ink=sig.trace.state>=2?ResultColor(sig.trace.state):(sig.plan.side==1?CorCompra:CorVenda);
  Label("status",30,122,Direction(sig.plan.side)+"  /  "+ResultCaption(sig),ink,11);
  Label("prices",30,151,"ENT "+Price(sig.plan.entry)+"    STOP "+Price(sig.plan.stop),clrWhite);
  Label("risk",30,177,"ALVO "+Price(sig.plan.target)+"    R:R 1:"+DoubleToString(Return123(3,sig.plan),2),CorAlvo);
  Label("when",30,203,"C3 "+TimeToString(bars[sig.shift].time,TIME_DATE|TIME_MINUTES)+(sig.trace.state==1?"  |  Operacao ativa":"  |  Ultimo sinal aceito"),clrSilver,9);
 }
 bool locked=ArraySize(signals)>0 && signals[0].trace.state==1;
 Label("context",30,231,"IFR2 "+(ArraySize(rsi)>1?DoubleToString(rsi[1],1):"--")+(locked?"  |  Novos sinais BLOQUEADOS":"  |  Busca de novos sinais liberada"),locked?clrGold:clrSilver,9);
}
// Keep result labels apart in screen space, then anchor to chart coordinates.
void ResultTag(string key,datetime when,double price,string caption,color ink,string tooltip) {
 int x,y;
 if(!ChartTimePriceToXY(0,0,when,price,x,y)) return;
 int width=(int)ChartGetInteger(0,CHART_WIDTH_IN_PIXELS);
 int height=(int)ChartGetInteger(0,CHART_HEIGHT_IN_PIXELS,0);
 if(x<0 || x>width || y<0 || y>height) return;
 int w=StringLen(caption)*8+12;
 x=MathMax(5,MathMin(x+8,width-w-70));
 int base=y;
 bool found=false;
 for(int attempt=0;attempt<24;attempt++) {
  int offset=22+(attempt/2)*24;
  y=base+(attempt%2==0?-offset:offset);
  if(y<20 || y>height-25) continue;
  bool overlaps=x<435 && x+w>14 && y<385;
  for(int j=0;j<ArraySize(tagX);j++)
   if(x<tagX[j]+tagW[j] && x+w>tagX[j] && MathAbs(y-tagY[j])<24) overlaps=true;
  if(!overlaps) { found=true; break; }
 }
 if(!found) return; // Tooltip and exit marker still preserve the result.
 int sub=0; datetime anchor; double anchorPrice;
 if(!ChartXYToTimePrice(0,x,y,sub,anchor,anchorPrice) || sub!=0) return;
 int n=ArraySize(tagX);
 ArrayResize(tagX,n+1); ArrayResize(tagY,n+1); ArrayResize(tagW,n+1);
 tagX[n]=x; tagY[n]=y; tagW[n]=w;
 TextAt(key,anchor,anchorPrice,caption,ink,tooltip);
 Line(key+"leader",when,price,anchor,anchorPrice,ink,STYLE_DOT);
}
void DrawSignal(int rank) {
 Signal123 sig=signals[rank];
 if(!Visible123(rank,viewMask)) return;
 int i=sig.shift;
 string key="draw"+IntegerToString(rank)+"_",tip=Details(sig);
 color ink=sig.plan.side==1?CorCompra:CorVenda;
 double tick=SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_SIZE);
 double gap=MathMax(tick*4,(bars[i].high-bars[i].low)*0.35);
 Marker(key+"pattern",bars[i].time,sig.plan.side==1?bars[i].low-gap:bars[i].high+gap,sig.plan.side==1?233:234,ink,tip);
 if((viewMask&8)!=0) {
  for(int k=0;k<3;k++) {
   int idx=i+2-k;
   TextAt(key+"n"+IntegerToString(k),bars[idx].time,sig.plan.side==1?bars[idx].low-gap*2:bars[idx].high+gap*2,IntegerToString(k+1),ink,tip);
  }
 }
 int entry=sig.trace.entryAge>=0?i-sig.trace.entryAge:-1;
 int end=sig.trace.exitAge>=0?i-sig.trace.exitAge:0;
 if((viewMask&16)!=0) {
  color resultInk=ResultColor(sig.trace.state);
  double exitPrice=sig.trace.state==3?sig.plan.target:(sig.trace.state==2?sig.plan.stop:sig.plan.entry);
  if(entry>=0) {
   Marker(key+"entry",bars[entry].time,sig.plan.entry,159,CorEntrada,tip);
   Line(key+"path",bars[entry].time,sig.plan.entry,bars[end].time,exitPrice,resultInk,STYLE_DASH,tip);
  }
  if(sig.trace.state>=2) Marker(key+"exit",bars[end].time,exitPrice,251,resultInk,tip);
  ResultTag(key+"result",bars[end].time,exitPrice,Direction(sig.plan.side)+" | "+ResultCaption(sig),resultInk,tip);
 }
 if(rank==0 && (viewMask&32)!=0) {
  datetime until=bars[0].time+(datetime)(PeriodSeconds()*ExtensaoNiveis);
  Line(key+"E",bars[i].time,sig.plan.entry,until,sig.plan.entry,CorEntrada,STYLE_SOLID,tip);
  Line(key+"S",bars[i].time,sig.plan.stop,until,sig.plan.stop,CorVenda,STYLE_DASH,tip);
  Line(key+"T",bars[i].time,sig.plan.target,until,sig.plan.target,CorAlvo,STYLE_SOLID,tip);
  TextAt(key+"Et",until,sig.plan.entry,"  ENTRADA "+Price(sig.plan.entry),CorEntrada,tip);
  TextAt(key+"St",until,sig.plan.stop,"  STOP "+Price(sig.plan.stop),CorVenda,tip);
  TextAt(key+"Tt",until,sig.plan.target,"  ALVO "+Price(sig.plan.target),CorAlvo,tip);
  if(MostrarParcial && MathAbs(sig.plan.target-sig.plan.entry)>MathAbs(sig.plan.partial-sig.plan.entry)+tick/2) {
   Line(key+"P",bars[i].time,sig.plan.partial,until,sig.plan.partial,clrGold,STYLE_DOT,tip);
   TextAt(key+"Pt",until,sig.plan.partial,"  PARCIAL 1R",clrGold,tip);
  }
 }
}
void Render() {
 ObjectsDeleteAll(0,prefix+"draw");
 ArrayResize(tagX,0); ArrayResize(tagY,0); ArrayResize(tagW,0);
 PlotIndexSetInteger(0,PLOT_DRAW_TYPE,(viewMask&4)!=0?DRAW_LINE:DRAW_NONE);
 PlotIndexSetInteger(1,PLOT_DRAW_TYPE,(viewMask&4)!=0?DRAW_LINE:DRAW_NONE);
 for(int j=0;j<ArraySize(signals);j++) DrawSignal(j);
 Panel(); ChartRedraw();
}
void RestoreChart() {
 if(!chartStyled) return;
 if(ChartGetInteger(0,CHART_COLOR_CANDLE_BULL)==CorCompra) ChartSetInteger(0,CHART_COLOR_CANDLE_BULL,oldBull);
 if(ChartGetInteger(0,CHART_COLOR_CANDLE_BEAR)==CorVenda) ChartSetInteger(0,CHART_COLOR_CANDLE_BEAR,oldBear);
 if(ChartGetInteger(0,CHART_COLOR_CHART_UP)==CorCompra) ChartSetInteger(0,CHART_COLOR_CHART_UP,oldUp);
 if(ChartGetInteger(0,CHART_COLOR_CHART_DOWN)==CorVenda) ChartSetInteger(0,CHART_COLOR_CHART_DOWN,oldDown);
 if(ChartGetInteger(0,CHART_MODE)==CHART_CANDLES) ChartSetInteger(0,CHART_MODE,oldMode);
}
int OnInit() {
 prefix="S123_"+IntegerToString(GetMicrosecondCount())+"_";
 if(MediaCurta<1 || MediaLonga<2 || MediaCurta>=MediaLonga || MargemTicks<1 || FatorAlvo<=0 ||
    ValidadeBarras<1 || HistoricoBarras<10 || HistoricoBarras>50000 || PadroesVisiveis<1 || PadroesVisiveis>50 || ExtensaoNiveis<1 || EspessuraMediaLonga<2 || EspessuraMediaLonga>5) return INIT_PARAMETERS_INCORRECT;

 viewMask=(MostrarHistorico?1:0)|(MostrarAtual?2:0)|(MostrarMedias?4:0)|(MostrarNumeracao?8:0)|(MostrarResultados?16:0)|(MostrarNiveis?32:0);
 SetIndexBuffer(0,Fast,INDICATOR_DATA); SetIndexBuffer(1,Slow,INDICATOR_DATA);
 ArraySetAsSeries(Fast,true); ArraySetAsSeries(Slow,true);
 ArraySetAsSeries(f,true); ArraySetAsSeries(s,true); ArraySetAsSeries(rsi,true);
 PlotIndexSetInteger(0,PLOT_LINE_COLOR,CorMediaCurta); PlotIndexSetInteger(1,PLOT_LINE_COLOR,CorMediaLonga);
 PlotIndexSetInteger(0,PLOT_LINE_WIDTH,1); PlotIndexSetInteger(1,PLOT_LINE_WIDTH,EspessuraMediaLonga);
 PlotIndexSetString(0,PLOT_LABEL,"MME "+IntegerToString(MediaCurta));
 PlotIndexSetString(1,PLOT_LABEL,"MME "+IntegerToString(MediaLonga));
 for(int j=0;j<2;j++) PlotIndexSetDouble(j,PLOT_EMPTY_VALUE,EMPTY_VALUE);
 hf=iMA(_Symbol,_Period,MediaCurta,0,MODE_EMA,PRICE_CLOSE);
 hs=iMA(_Symbol,_Period,MediaLonga,0,MODE_EMA,PRICE_CLOSE);
 hr=iRSI(_Symbol,_Period,2,PRICE_CLOSE);
 if(hf==INVALID_HANDLE || hs==INVALID_HANDLE || hr==INVALID_HANDLE) return INIT_FAILED;
 if(ColorirCandles) {
  oldBull=ChartGetInteger(0,CHART_COLOR_CANDLE_BULL); oldBear=ChartGetInteger(0,CHART_COLOR_CANDLE_BEAR);
  oldUp=ChartGetInteger(0,CHART_COLOR_CHART_UP); oldDown=ChartGetInteger(0,CHART_COLOR_CHART_DOWN);
  oldMode=ChartGetInteger(0,CHART_MODE); chartStyled=true;
  ChartSetInteger(0,CHART_MODE,CHART_CANDLES);
  ChartSetInteger(0,CHART_COLOR_CANDLE_BULL,CorCompra); ChartSetInteger(0,CHART_COLOR_CANDLE_BEAR,CorVenda);
  ChartSetInteger(0,CHART_COLOR_CHART_UP,CorCompra); ChartSetInteger(0,CHART_COLOR_CHART_DOWN,CorVenda);
 }
 IndicatorSetString(INDICATOR_SHORTNAME,"Stormer 123 | Visual 1.30");
 Panel(); return INIT_SUCCEEDED;
}
void OnDeinit(const int reason) {
 ObjectsDeleteAll(0,prefix); RestoreChart();
 if(hf!=INVALID_HANDLE) IndicatorRelease(hf);
 if(hs!=INVALID_HANDLE) IndicatorRelease(hs);
 if(hr!=INVALID_HANDLE) IndicatorRelease(hr);
 ChartRedraw();
}
void OnChartEvent(const int id,const long &lparam,const double &dparam,const string &sparam) {
 if(id==CHARTEVENT_OBJECT_CLICK && StringFind(sparam,prefix+"btn")==0) {
  int flag=(int)StringToInteger(StringSubstr(sparam,StringLen(prefix+"btn")));
  viewMask=Toggle123(viewMask,flag); Render();
 } else if(id==CHARTEVENT_CHART_CHANGE) Render();
}
int OnCalculate(const int total,const int prev,const datetime &time[],const double &open[],const double &high[],const double &low[],const double &close[],const long &tick_volume[],const long &volume[],const int &spread[]) {
 if(total<MediaLonga+5) return 0;
 ArraySetAsSeries(time,true); ArraySetAsSeries(high,true); ArraySetAsSeries(low,true);
 int available=total-MediaLonga-3;
 int limit=MathMin(HistoricoBarras,available);
 if(windowStart!=0) {
  while(limit<available && time[limit]>windowStart) limit++;
  if(time[limit]>windowStart) {
   Label("context",30,231,"Historico insuficiente: carregue mais candles",clrGold,9);
   return prev;
  }
 }
 int count=MathMin(total,limit+MediaLonga+3);
 if(CopyBuffer(hf,0,0,count,f)!=count || CopyBuffer(hs,0,0,count,s)!=count || CopyBuffer(hr,0,0,2,rsi)!=2) return prev;
 double tick=SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_SIZE);
 if(tick<=0) return prev;
 if(windowStart==0) windowStart=time[limit];
 bool fresh=time[0]!=lastBar || prev==0;
 int previousCount=ArraySize(signals);
 int previousState=previousCount>0?signals[0].trace.state:-1;
 if(fresh) { ArrayInitialize(Fast,EMPTY_VALUE); ArrayInitialize(Slow,EMPTY_VALUE); }
 ArrayResize(bars,count);
 for(int i=0;i<count;i++) {
  Fast[i]=f[i]; Slow[i]=s[i];
  bars[i].time=time[i]; bars[i].high=high[i]; bars[i].low=low[i];
 }
 // Replay ALL candidate bars oldest -> newest, before applying the display cap.
 // Prices of a bar are processed first; a C3 offer only becomes known at its close.
 Sequence123 sequence={};
 ArrayResize(signals,0);
 for(int i=limit;i>=0;i--) {
  bool candidate=false;
  Plan123 plan={0,0,0,0,0};
  if(i>=1) {
   Bar123 a={high[i+2],low[i+2]},b={high[i+1],low[i+1]},c={high[i],low[i]};
   int side=Pattern123(a,b,c);
   bool trend=side!=0 && (!FiltroTendencia || Trend123(side,f[i],f[i+1],s[i],s[i+1]));
   bool inside=!ApenasInsideBar || (c.high<b.high && c.low>b.low);
   if(trend && inside) {
    plan=Levels123(side,a,b,c,tick,TipoStop,TipoAlvo,FatorAlvo,MargemTicks);
    candidate=side*(plan.target-plan.entry)>0;
   }
  }
  Bar123 price={high[i],low[i]};
  SequenceEvent123 event=Process123(sequence,price,limit-i,ValidadeBarras,i>=1,candidate,plan);
  int n=ArraySize(signals);
  if(event.updated && n>0) signals[0].trace=event.previous;
  if(event.accepted) {
   int keep=MathMin(n+1,PadroesVisiveis);
   ArrayResize(signals,keep);
   for(int j=keep-1;j>0;j--) signals[j]=signals[j-1];
   signals[0].shift=i; signals[0].plan=sequence.plan; signals[0].trace=sequence.trace;
  }
 }
 int currentState=ArraySize(signals)>0?signals[0].trace.state:-1;
 bool changed=fresh || previousCount!=ArraySize(signals) || previousState!=currentState;
 if(changed) Render();
 if(fresh && lastBar!=0 && prev>0 && ArraySize(signals)>0 && signals[0].shift==1) {
  string msg=_Symbol+" "+EnumToString(_Period)+" | 123 "+Direction(signals[0].plan.side)+" formado. Entrada "+Price(signals[0].plan.entry);
  if(Alertas) Alert(msg);
  if(Push) SendNotification(msg);
 }
 lastBar=time[0];
 return total;
}



