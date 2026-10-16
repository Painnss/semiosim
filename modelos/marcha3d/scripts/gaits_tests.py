
import math, random
def _rt(p, n, L, dt, mod=None, W=None, ts=3, tdt=0.6):
    p.walk(n, L, dt, mod=mod, W=W); p.turn(math.pi, ts, tdt); p.walk(n, L, dt, mod=mod, W=W); p.turn(math.pi, ts, tdt); p.home(); p.pause(0.5)
BAL = lambda t, k=1.0: dict(arm_r=dict(flex=8 + 6 * k * math.sin(t * 2.3), abd=24 + 12 * k * math.sin(t * 1.7), elbow=25),
                             arm_l=dict(flex=8 - 6 * k * math.sin(t * 2.1), abd=24 - 12 * k * math.sin(t * 1.9 + 1), elbow=25))
TAN = dict(hs=10, to=18, flat_t=0.10, heeloff_t=0.15, swing_t=0.5, clear=0.03, swing_pitch=-4, sway=0.01)

def TN_def(ns):   # tándem normal
    p = ns['Plan'](dict(TAN), y=1.6, psi=0.0, width=0.10)
    _rt(p, 10, 0.27, 0.9, W=0.0)
    def ub(t, c): d = dict(flex=2, head_pitch=14); d.update(BAL(t, .3)); return d
    return p, ub

def TX_def(ns):   # tándem imposible: ataxia cerebelosa
    rnd = random.Random(5)
    p = ns['Plan'](dict(TAN, sway=0.04), y=1.6, psi=0.0, width=0.10)
    mod = lambda i, s: ({'dlat': rnd.choice([-1, 1]) * rnd.uniform(0.14, 0.22), 'kT': 1.3, 'kL': 0.6} if i % 3 == 2 else {'kT': rnd.uniform(0.9, 1.2), 'dlat': rnd.uniform(-0.04, 0.04)})
    rnd.seed(5); p.walk(9, 0.27, 0.9, mod=mod, W=0.0); p.turn(math.pi, 5, 0.8)
    rnd.seed(5); p.walk(9, 0.27, 0.9, mod=mod, W=0.0); p.turn(math.pi, 5, 0.8); p.home(); p.pause(0.5)
    def ub(t, c):
        s1 = math.sin(2 * math.pi * 0.45 * t); s2 = math.sin(2 * math.pi * 1.1 * t + 1)
        d = dict(flex=4, lean=9 * s1 + 4 * s2, shift=0.05 * s1, head_pitch=10, head_roll=-5 * s1); d.update(BAL(t, 1.6)); return d
    return p, ub

def TH_def(ns):   # tándem imposible: hemiparesia derecha
    p = ns['Plan'](dict(TAN, sway=0.03), y=1.6, psi=0.0, width=0.12)
    p.side_style['R'] = dict(strike='flat', strike_pitch=10, to=5, swing_pitch=22, clear=0.0, circ=0.10)
    mod = lambda i, s: ({'kL': 0.25, 'dlat': -0.16, 'kT': 1.4} if s == 'R' else {'kL': 0.9, 'dlat': 0.05})
    _rt(p, 8, 0.27, 1.0, mod=mod, W=0.0, ts=4, tdt=0.9)
    def ub(t, c):
        s1 = math.sin(2 * math.pi * 0.5 * t)
        d = dict(flex=4, lean=6 + 5 * s1, head_pitch=12, shift=0.03 * s1)
        d['arm_r'] = dict(flex=4, abd=-4, irot=30, elbow=88, pron=60, wrist=45, mcp=75, ip=85, thumb=45)
        d['arm_l'] = dict(flex=10, abd=30 + 10 * s1, elbow=25); return d
    return p, ub

def TI_def(ns):   # tándem posible pero inseguro / lento
    rnd = random.Random(9)
    p = ns['Plan'](dict(TAN, sway=0.02), y=1.6, psi=0.0, width=0.10)
    mod = lambda i, s: {'dlat': rnd.uniform(-0.035, 0.035), 'kT': rnd.uniform(1.0, 1.4)}
    rnd.seed(9); p.walk(9, 0.27, 1.1, mod=mod, W=0.0); p.turn(math.pi, 4, 0.8)
    rnd.seed(9); p.walk(9, 0.27, 1.1, mod=mod, W=0.0); p.turn(math.pi, 4, 0.8); p.home(); p.pause(0.5)
    def ub(t, c):
        s1 = math.sin(2 * math.pi * 0.6 * t)
        d = dict(flex=5, lean=4 * s1, head_pitch=18, shift=0.015 * s1); d.update(BAL(t, 1.0)); return d
    return p, ub

HEEL = dict(stance_pitch=-24, swing_pitch=-26, swing_t=0.34, clear=0.03, sway=0.02)
def HN_def(ns):   # talones normal
    p = ns['Plan'](dict(HEEL), y=1.8, psi=0.0, width=0.12)
    _rt(p, 10, 0.34, 0.52)
    def ub(t, c): d = dict(flex=6, head_pitch=6, crouch=-0.01); d.update(ns['arms_swing'](c, amp=14, abd=12)); return d
    return p, ub
def HR_def(ns):   # talones: no eleva la punta derecha
    p = ns['Plan'](dict(HEEL), y=1.8, psi=0.0, width=0.12)
    p.side_style['R'] = dict(stance_pitch=2, swing_pitch=22, clear=0.03)
    _rt(p, 10, 0.32, 0.56)
    def ub(t, c): d = dict(flex=6, head_pitch=14, lean=2); d.update(ns['arms_swing'](c, amp=12, abd=16)); return d
    return p, ub
def HB_def(ns):   # talones: pies caídos bilaterales
    p = ns['Plan'](dict(HEEL, stance_pitch=3, swing_pitch=26, clear=0.06), y=1.8, psi=0.0, width=0.16)
    _rt(p, 9, 0.30, 0.62)
    def ub(t, c): d = dict(flex=8, head_pitch=24); d.update(BAL(t, .8)); return d
    return p, ub
def HX_def(ns):   # talones: fuerza conservada pero inestable (ataxia)
    rnd = random.Random(4)
    p = ns['Plan'](dict(HEEL, sway=0.05), y=1.8, psi=0.0, width=0.24)
    mod = lambda i, s: {'kL': rnd.uniform(0.6, 1.3), 'dlat': rnd.uniform(-0.07, 0.07), 'kT': rnd.uniform(0.85, 1.3)}
    rnd.seed(4); p.walk(10, 0.34, 0.58, mod=mod); p.turn(math.pi, 5, 0.7)
    rnd.seed(4); p.walk(10, 0.34, 0.58, mod=mod); p.turn(math.pi, 5, 0.7); p.home(); p.pause(0.5)
    def ub(t, c):
        s1 = math.sin(2 * math.pi * 0.4 * t); d = dict(flex=6, lean=8 * s1, shift=0.04 * s1, head_pitch=8); d.update(BAL(t, 1.4)); return d
    return p, ub

TOE = dict(stance_pitch=34, swing_pitch=24, swing_t=0.34, clear=0.03, sway=0.02)
def PN_def(ns):   # puntas normal
    p = ns['Plan'](dict(TOE), y=1.8, psi=0.0, width=0.12)
    _rt(p, 10, 0.36, 0.5)
    def ub(t, c): d = dict(flex=2, head_pitch=4, crouch=-0.09); d.update(ns['arms_swing'](c, amp=16, abd=10)); return d
    return p, ub
def PR_def(ns):   # puntas: el talón derecho desciende (flexores plantares derechos débiles)
    p = ns['Plan'](dict(TOE), y=1.8, psi=0.0, width=0.12)
    cnt = {'R': 0}
    def mod(i, s):
        if s != 'R': return {}
        cnt['R'] += 1; k = cnt['R'] % 6
        return {'style': dict(stance_pitch=[30, 18, 8, 0, 0, 0][k], strike='flat')}
    _rt(p, 10, 0.34, 0.54, mod=mod)
    def ub(t, c):
        F = c['F']; i = c['i']
        d = dict(flex=3, head_pitch=8, crouch=-0.05, lean=3 * ns['bump'](F, 'L', i)); d.update(ns['arms_swing'](c, amp=14, abd=12)); return d
    return p, ub
def PX_def(ns):   # puntas: inestable (ataxia / polineuropatía)
    rnd = random.Random(8)
    p = ns['Plan'](dict(TOE, sway=0.05, stance_pitch=26), y=1.8, psi=0.0, width=0.22)
    mod = lambda i, s: {'kL': rnd.uniform(0.6, 1.3), 'dlat': rnd.uniform(-0.07, 0.07), 'kT': rnd.uniform(0.85, 1.3), 'style': ({'stance_pitch': 0} if i % 4 == 3 else {})}
    rnd.seed(8); p.walk(10, 0.34, 0.56, mod=mod); p.turn(math.pi, 5, 0.7)
    rnd.seed(8); p.walk(10, 0.34, 0.56, mod=mod); p.turn(math.pi, 5, 0.7); p.home(); p.pause(0.5)
    def ub(t, c):
        s1 = math.sin(2 * math.pi * 0.42 * t); d = dict(flex=4, lean=8 * s1, shift=0.04 * s1, head_pitch=8, crouch=-0.06); d.update(BAL(t, 1.4)); return d
    return p, ub
