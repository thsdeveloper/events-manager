#include <cmath>
#include <iostream>
#include "../Stormer123Core.mqh"
int failures=0, checks=0;
void check(bool value,const char *name) { ++checks; if(!value) { ++failures; std::cerr<<"FAIL: "<<name<<"\n"; } }
bool near(double a,double b) {return std::abs(a-b)<1e-8;}
int main() {
 Bar123 a={12,8}, b={11,6}, c={10,7};
 check(Pattern123(a,b,c)==1,"compra com menor minima central");
 Bar123 x={12,8}, y={14,9}, z={13,10};
 check(Pattern123(x,y,z)==-1,"venda com maior maxima central");
 Bar123 flat={12,8}, outside={14,6};
 check(Pattern123(flat,flat,flat)==0,"empates nao formam padrao");
 check(Pattern123(a,outside,c)==0,"outside central ambiguo rejeitado");
 check(Trend123(1,11,10,8,7),"duas medias ascendentes");
 check(Trend123(-1,8,9,11,12),"duas medias descendentes");
 check(!Trend123(1,11,10,8,8),"media lenta plana rejeita");
 check(!Trend123(-1,11,10,8,7),"tendencia oposta rejeita");
 check(!Trend123(1,8,7,11,10),"compra rejeitada se curta abaixo da longa mesmo ambas subindo");
 check(!Trend123(-1,11,12,8,9),"venda rejeitada se curta acima da longa mesmo ambas caindo");
 check(!Trend123(1,8,7,8,7),"medias iguais nao autorizam compra");
 check(!Trend123(-1,8,9,8,9),"medias iguais nao autorizam venda");
 check(!Trend123(1,11,12,8,7),"alinhamento comprador nao dispensa curta ascendente");
 check(!Trend123(-1,8,9,11,10),"alinhamento vendedor nao dispensa longa descendente");
 check(!Trend123(1,11,11,8,7),"curta plana nao autoriza compra alinhada");
 check(!Trend123(-1,8,9,11,11),"longa plana nao autoriza venda alinhada");
 check(Trend123(1,10,8,9,8.5),"cruzamento comprador com ambas ascendentes e aceito");
 check(Trend123(-1,8,10,9,9.5),"cruzamento vendedor com ambas descendentes e aceito");
 Plan123 p=Levels123(1,a,b,c,0.25,0,0,1.61,1);
 check(near(p.entry,10.25)&&near(p.stop,5.75),"compra um tick e stop C2");
 check(near(p.target,17.5)&&near(p.partial,14.75),"alvo 1.61R arredondado e parcial 1R");
 Plan123 q=Levels123(-1,x,y,z,0.25,1,1,1,1);
 check(near(q.entry,9.75)&&near(q.stop,13.25)&&near(q.target,3.75),"venda stop C3 alvo amplitude");
 check(Step123(0,p,10,7,false)==0,"aguarda rompimento");
 check(Step123(0,p,11,7,false)==1,"rompimento ativa");
 check(Step123(0,p,10,5,false)==5,"stop antes entrada invalida");
 check(Step123(0,p,18,5,false)==6,"entrada e stop mesma barra ambiguos");
 check(Step123(0,p,18,7,false)==6,"entrada e alvo mesma barra ambiguos");
 check(Step123(0,p,10,7,true)==4,"validade expirada");
 check(Step123(1,p,18,7,false)==3,"alvo apos entrada");
 check(Step123(1,p,11,5,false)==2,"stop apos entrada");
 check(Step123(1,p,18,5,false)==6,"stop e alvo mesma barra ambiguos");
 check(Step123(1,p,11,7,true)==1,"validade nao encerra ativo");
 check(Step123(3,p,11,5,false)==3,"resultado final imutavel");
 check(Step123(0,q,12,9,false)==1,"venda ativa ao perder minima");
 check(Step123(1,q,12,3,false)==3,"venda atinge alvo");
 check(Step123(1,q,14,8,false)==2,"venda atinge stop");
 Trace123 gain={0,-1,-1};
 Advance123(gain,p,11,7,1,1);
 check(gain.state==1 && gain.entryAge==1 && gain.exitAge==-1,"historico guarda candle de entrada");
 Advance123(gain,p,18,7,2,1);
 check(gain.state==3 && gain.exitAge==2,"historico fecha GAIN no candle do alvo");
 Advance123(gain,p,11,5,3,1);
 check(gain.state==3 && gain.exitAge==2,"resultado historico nao muda com barras posteriores");
 Trace123 loss={0,-1,-1};
 Advance123(loss,q,12,9,1,1); Advance123(loss,q,14,8,2,1);
 check(loss.state==2 && loss.entryAge==1 && loss.exitAge==2,"historico de venda registra LOSS");
 Trace123 ambiguous={0,-1,-1}; Advance123(ambiguous,p,18,5,1,1);
 check(ambiguous.state==6 && ambiguous.entryAge==-1 && ambiguous.exitAge==1,"incerto nao inventa execucao");
 Trace123 expired={0,-1,-1}; Advance123(expired,p,10,7,1,1); Advance123(expired,p,10,7,2,1);
 check(expired.state==4 && expired.entryAge==-1,"expirado permanece sem entrada");
 Trace123 invalid={0,-1,-1}; Advance123(invalid,p,10,5,1,1);
 check(invalid.state==5 && invalid.exitAge==1,"invalidacao nao vira loss");
 const char *labels[]={"AGUARDANDO","EM ANDAMENTO","LOSS","GAIN","EXPIRADO","SEM ENTRADA","INCERTO"};
 for(int state=0;state<7;state++) check(Outcome123(state)==labels[state],"rotulo distingue resultado de ausencia de operacao");
 check(near(Return123(3,p),(p.target-p.entry)/(p.entry-p.stop)),"gain mostra R real apos arredondamento");
 check(near(Return123(3,q),(q.entry-q.target)/(q.stop-q.entry)),"gain vendedor mostra R positivo");
 check(near(Return123(2,p),-1),"loss mostra menos 1R");
 check(near(Return123(6,p),0),"incerto nao tem retorno atribuido");
 for(int mask=0;mask<4;mask++) {
  check(Visible123(0,mask)==bool(mask&2),"sinal atual independente do historico");
  check(Visible123(1,mask)==bool(mask&1),"historico independente do sinal atual");
 }
 for(int flag: {1,2,4,8,16,32}) {
  check(Toggle123(63,flag)==(63^flag),"botao oculta somente a camada selecionada");
  check(Toggle123(Toggle123(63,flag),flag)==63,"segundo clique restaura a camada");
 }
 check(Toggle123(63,0)==63 && Toggle123(63,64)==63,"clique desconhecido nao altera card");
 // Feed closed bars in chronological order; candidates become available at close.
 Sequence123 seq={};
 Bar123 quiet={10,7}, trigger={11,7}, gainBar={18,7}, stopBar={11,5}, both={18,5};
 SequenceEvent123 e=Process123(seq,quiet,0,1,true,false,p);
 check(!e.accepted && !e.updated && !seq.hasSignal,"barra sem sinal nao abre operacao");
 e=Process123(seq,gainBar,1,1,true,true,p);
 check(e.accepted && seq.trace.state==0 && seq.formed==1,"C3 nao pode acionar a propria entrada");
 e=Process123(seq,trigger,2,1,true,true,q);
 check(!e.accepted && e.updated && seq.plan.side==1 && seq.trace.state==1,"compra ativa bloqueia venda e conserva card");
 e=Process123(seq,trigger,3,1,true,true,p);
 check(!e.accepted && seq.formed==1 && seq.trace.state==1,"compra ativa bloqueia outra compra mesmo apos validade");
 e=Process123(seq,gainBar,4,1,true,false,p);
 check(!e.accepted && e.previous.state==3 && seq.trace.state==3,"alvo encerra compra sem recuperar sinais ignorados");
 e=Process123(seq,quiet,5,1,true,true,q);
 check(e.accepted && seq.plan.side==-1 && seq.formed==5,"novo padrao apos gain libera venda");
 Bar123 sellTrigger={12,9}, sellStop={14,8}, sellGain={12,3};
 e=Process123(seq,sellTrigger,6,1,true,true,p);
 check(!e.accepted && seq.trace.state==1 && seq.plan.side==-1,"venda ativa bloqueia compra");
 e=Process123(seq,sellTrigger,7,1,true,true,q);
 check(!e.accepted && seq.plan.side==-1 && seq.formed==5,"venda ativa bloqueia outra venda");
 e=Process123(seq,sellStop,8,1,true,true,p);
 check(e.accepted && e.previous.state==2 && e.previous.exitAge==3 && seq.trace.state==0,"novo C3 fechado apos stop pode preparar proxima entrada");
 e=Process123(seq,trigger,9,1,false,true,q);
 check(!e.accepted && seq.trace.state==1,"C0 atualiza operacao mas nao cria novos padroes");
 e=Process123(seq,both,10,1,true,true,q);
 check(!e.accepted && seq.trace.state==6,"saida incerta bloqueia reentrada na mesma barra");
 e=Process123(seq,quiet,11,1,true,true,q);
 check(e.accepted && seq.formed==11,"apos incerto aceita apenas novo C3 em barra posterior");
 e=Process123(seq,sellTrigger,12,1,true,false,p);
 e=Process123(seq,sellGain,13,1,true,true,p);
 check(e.accepted && e.previous.state==3,"gain vendedor libera novo padrao");
 Sequence123 waiting={};
 e=Process123(waiting,quiet,0,3,true,true,p);
 e=Process123(waiting,quiet,1,3,true,true,q);
 check(e.accepted && e.previous.state==7 && e.previous.entryAge==-1 && waiting.plan.side==-1,"antes de ativar novo padrao substitui pendente sem loss");
 check(Outcome123(7)=="SUBSTITUIDO" && Return123(7,p)==0,"substituido nao recebe gain ou loss");
 Sequence123 timeout={};
 Process123(timeout,quiet,0,1,true,true,p);
 Process123(timeout,quiet,1,1,true,false,p);
 e=Process123(timeout,quiet,2,1,true,true,q);
 check(e.accepted && e.previous.state==4,"pendente expirado libera novo sinal");
 Sequence123 invalidated={};
 Process123(invalidated,quiet,0,1,true,true,p);
 Bar123 beforeEntryStop={10,5};
 e=Process123(invalidated,beforeEntryStop,1,1,true,true,q);
 check(e.accepted && e.previous.state==5,"invalido antes da entrada libera novo sinal");
 Sequence123 ambiguousEntry={};
 Process123(ambiguousEntry,quiet,0,1,true,true,p);
 e=Process123(ambiguousEntry,both,1,1,true,true,q);
 check(!e.accepted && e.previous.state==6 && ambiguousEntry.plan.side==1,"entrada ambigua nao aceita outro sinal na mesma vela");
 // A long-running entry stays locked; replaying from its start gives the same result.
 Sequence123 live={},replay={}; int admitted=0;
 for(int index=0;index<40;index++) {
  Bar123 sample=index==0?quiet:trigger;
  SequenceEvent123 step=Process123(live,sample,index,1,true,true,index%2==0?p:q);
  if(step.accepted) admitted++;
 }
 check(admitted==1 && live.trace.state==1 && live.formed==0,"operacao longa continua bloqueada apesar de muitos novos padroes");
 for(int index=0;index<40;index++) Process123(replay,index==0?quiet:trigger,index,1,true,true,index%2==0?p:q);
 check(replay.formed==live.formed && replay.trace.state==live.trace.state && near(replay.plan.entry,live.plan.entry),"reconstrucao historica e processamento sequencial concordam");
 Sequence123 stoppedBuy={};
 Process123(stoppedBuy,quiet,0,1,true,true,p);
 Process123(stoppedBuy,trigger,1,1,true,false,p);
 e=Process123(stoppedBuy,stopBar,2,1,true,true,q);
 check(e.accepted && e.previous.state==2 && stoppedBuy.plan.side==-1,"loss comprador libera venda no fechamento");
 std::cout<<checks<<" checks, "<<failures<<" failures\n"; return failures?1:0;
}





