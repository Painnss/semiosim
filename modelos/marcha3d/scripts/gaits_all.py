
import math, random
def H_def(ns):
    P = ns['Plan']; bump = ns['bump']
    st = dict(hs=12, to=28, flat_t=0.12, heeloff_t=0.22, swing_t=0.48, clear=0.025, swing_pitch=-3, sway=0.03, mid_sig=7)
    p = P(st, y=1.5, psi=0.0, width=0.12)
    # pie derecho: equino-varo, sin despegue, roza con la punta, circunducción
    p.side_style['R'] = dict(strike='flat', strike_pitch=10, to=6, heeloff_t=0.08, swing_pitch=26, clear=0.0, circ=0.20,
                             roll=8, roll_swing=14, swing_t=0.62)
    p.walk(6, 0.42, 0.82); p.turn(math.pi, 4, 0.9); p.walk(6, 0.42, 0.82); p.turn(math.pi, 4, 0.9); p.pause(0.5)
    def ub(t, c):
        F = c['F']; i = c['i']; bR = bump(F, 'R', i)
        d = dict(flex=4, lean=7 + 8 * bR, head_roll=-6 - 4 * bR, head_yaw=ns['head_lead'](c, 12, .4),
                 p_obl=12 * bR - 2 * bump(F, 'L', i), shift=-0.03 * bR, p_rot=-2 * bR, knee_out=1.0)
        a = ns['arms_swing'](c, ampR=0, ampL=26)
        a['arm_r'] = dict(flex=4, abd=-4, irot=30, elbow=88, pron=60, wrist=45, mcp=75, ip=85, thumb=45)
        d.update(a); return d
    return p, ub

import math

def P_def(ns):
    P = ns['Plan']; bump = ns['bump']
    st = dict(strike='flat', strike_pitch=0, hs=0, to=8, heeloff_t=0.08, flat_t=0.05, swing_t=0.30, clear=0.012, swing_pitch=0, sway=0.012, mid_sig=4)
    p = P(st, y=2.0, psi=0.0, width=0.12)
    frz = dict(clear=0.004, swing_t=0.11, to=1)
    acc = lambda i, s: {'kL': 0.75 + 0.07 * i, 'kT': max(0.62, 1 - 0.06 * i)}
    p.mark('ini0'); p.inplace(5, 0.20, **frz); p.mark('ini1')
    p.mark('f0'); p.walk(8, 0.26, 0.42, mod=acc, close=False); p.mark('f1')
    p.mark('z0'); p.inplace(6, 0.17, **frz); p.mark('z1')
    p.walk(6, 0.24, 0.40)
    p.turn(math.pi, 8, 0.40)
    p.mark('f2'); p.walk(4, 0.26, 0.42, mod=acc, close=False); p.mark('f3')
    p.mark('z2'); p.inplace(5, 0.17, **frz); p.mark('z3')
    p.mark('f4'); p.walk(11, 0.243, 0.42, mod=acc); p.mark('f5')
    p.turn(math.pi, 8, 0.40); p.pause(0.6)
    M = p.marks
    def win(t, a, b): return 0.0 if t < M[a] or t > M[b] else (t - M[a]) / max(1e-3, M[b] - M[a])
    def ub(t, c):
        fest = max(win(t, 'f0', 'f1'), win(t, 'f2', 'f3'), win(t, 'f4', 'f5'))
        frzv = 1.0 if (M['z0'] <= t <= M['z1'] or M['z2'] <= t <= M['z3'] or M['ini0'] <= t <= M['ini1']) else 0.0
        tr = math.sin(2 * math.pi * 5.0 * t)
        d = dict(flex=13 + 9 * fest, p_tilt=6, crouch=0.055, head_pitch=4, p_rot=0, twist=0, head_yaw=0, p_obl=0,
                 fshift=0.02 * fest, head_roll=0)
        d['arm_r'] = dict(flex=14, abd=5, elbow=42, pron=12 * tr, wrist=10, mcp=25 + 8 * tr, ip=20, thumb=25 + 12 * tr)
        dl = ns['dfoot'](c)
        d['arm_l'] = dict(flex=10 + 8 * dl, abd=5, elbow=38, wrist=5, mcp=15, ip=15, thumb=10)
        return d
    return p, ub

import random

def A_def(ns):
    P = ns['Plan']; bump = ns['bump']; rnd = random.Random(7)
    st = dict(hs=10, to=24, flat_t=0.10, heeloff_t=0.18, swing_t=0.45, clear=0.05, swing_pitch=-4, sway=0.05, mid_sig=6)
    p = P(st, y=2.0, psi=0.0, width=0.30)
    def irr(i, s):
        return {'kL': rnd.uniform(0.55, 1.35), 'dlat': rnd.uniform(-0.09, 0.09), 'kT': rnd.uniform(0.8, 1.35), 'dpsi': math.radians(rnd.uniform(-14, 14)), 'dW': rnd.uniform(-0.25, 0.35)}
    rnd.seed(7); p.walk(9, 0.42, 0.62, mod=irr)
    p.turn(math.pi, 6, 0.75, mod=lambda i, s: {'kT': rnd.uniform(0.8, 1.6)})
    rnd.seed(7); p.walk(9, 0.42, 0.62, mod=irr)
    p.turn(math.pi, 6, 0.75, mod=lambda i, s: {'kT': rnd.uniform(0.8, 1.6)}); p.pause(0.6)
    def ub(t, c):
        s1 = math.sin(2 * math.pi * 0.37 * t); s2 = math.sin(2 * math.pi * 0.83 * t + 1.3); s3 = math.sin(2 * math.pi * 3.1 * t)
        d = dict(flex=5, lean=8 * s1 + 4 * s2, head_roll=-5 * s1, shift=0.05 * s1 + 0.03 * s2, head_pitch=6 + 2 * s3,
                 head_yaw=3 * s3, p_obl=3 * s2)
        d.update(ns['pelvis_osc'](c, rot=6, obl=3, counter=0.3))
        d['lean'] = 8 * s1 + 4 * s2
        d['arm_r'] = dict(flex=10 + 8 * s2, abd=32 + 10 * s1, elbow=30, wrist=5, mcp=10, ip=10)
        d['arm_l'] = dict(flex=10 - 8 * s2, abd=32 - 10 * s1, elbow=30, wrist=5, mcp=10, ip=10)
        return d
    return p, ub

def S_def(ns, right_only=False):
    P = ns['Plan']; bump = ns['bump']
    st = dict(hs=8, to=25, flat_t=0.10, heeloff_t=0.2, swing_t=0.42, clear=0.03, swing_pitch=-4, sway=0.025, mid_sig=5)
    drop = dict(strike='flat', strike_pitch=22, flat_t=0.045, to=18, swing_pitch=38, clear=0.17, clear_pow=0.8, swing_t=0.5)
    p = P(st, y=2.0, psi=0.0, width=0.10 if right_only else 0.17)
    p.side_style['R'] = dict(drop)
    if not right_only: p.side_style['L'] = dict(drop)
    p.walk(8, 0.52, 0.62); p.turn(math.pi, 4, 0.65); p.walk(8, 0.52, 0.62); p.turn(math.pi, 4, 0.65); p.pause(0.5)
    def ub(t, c):
        d = dict(flex=6 if not right_only else 2, head_pitch=26 if not right_only else 0, head_yaw=ns['head_lead'](c, 10, .5))
        d.update(ns['pelvis_osc'](c, rot=8, obl=3))
        if right_only:
            d.update(ns['arms_swing'](c, ampR=10, ampL=30))
            d['arm_r'].update(mcp=-25, ip=75, thumb=10, wrist=-10)
        else:
            d.update(ns['arms_swing'](c, amp=24, abd=9))
        return d
    return p, ub

def L_def(ns):
    P = ns['Plan']; bump = ns['bump']
    st = dict(hs=4, to=12, flat_t=0.12, heeloff_t=0.14, swing_t=0.45, clear=0.02, swing_pitch=-2, sway=0.035, mid_sig=7)
    p = P(st, y=1.4, psi=0.0, width=0.24)
    back = lambda i, s: ({'kL': -0.9, 'kT': 1.3} if i == 4 else {})
    p.walk(9, 0.28, 0.95, mod=back); p.turn(math.pi, 6, 1.0); p.walk(9, 0.28, 0.95, mod=back); p.turn(math.pi, 6, 1.0); p.pause(0.6)
    def ub(t, c):
        s1 = math.sin(2 * math.pi * 0.4 * t)
        d = dict(flex=-4 + 2 * s1, p_tilt=-4, crouch=0.035, head_pitch=12, lean=3 * s1, shift=0.02 * s1, fshift=-0.04)
        d.update(ns['pelvis_osc'](c, rot=3, obl=2))
        d['arm_l'] = dict(flex=18, abd=50, elbow=35, irot=-25, wrist=10, mcp=55, ip=60, thumb=30)   # se agarra del acompañante
        d['arm_r'] = dict(flex=8 + 4 * s1, abd=20, elbow=25, mcp=15, ip=15)
        return d
    return p, ub

def N_def(ns):
    P = ns['Plan']
    st = dict(hs=18, to=38, flat_t=0.09, heeloff_t=0.20, swing_t=0.40, clear=0.03, swing_pitch=-4, sway=0.02)
    p = P(st, y=2.0, psi=0.0, width=0.10)
    p.walk(7, 0.66, 0.53); p.turn(math.pi, 3, 0.55); p.walk(7, 0.66, 0.53); p.turn(math.pi, 3, 0.55); p.pause(0.5)
    def ub(t, c):
        d = dict(flex=2, head_pitch=0, head_yaw=ns['head_lead'](c))
        d.update(ns['arms_swing'](c)); d.update(ns['pelvis_osc'](c)); return d
    return p, ub
