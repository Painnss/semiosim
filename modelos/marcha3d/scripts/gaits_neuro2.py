
import math, random
def _pnoise(T, seed, kmin=3, kmax=30, n=12):
    r = random.Random(seed); comps = [(r.randint(kmin, kmax), r.uniform(0, 6.283), r.uniform(.5, 1)) for _ in range(n)]
    norm = math.sqrt(sum(a * a for _, _, a in comps) / 2)
    return lambda t: sum(a * math.sin(2 * math.pi * k * t / T + ph) for k, ph, a in comps) / norm

def T_def(ns):   # tijera: paraparesia espástica
    P = ns['Plan']; bump = ns['bump']
    st = dict(strike='flat', strike_pitch=10, to=6, heeloff_t=0.08, flat_t=0.08, swing_t=0.52, clear=0.0, swing_pitch=16, sway=0.05)
    p = P(st, y=2.0, psi=0.0, width=0.06)
    ns['_route'](p, 10, 0.32, 0.72, turn_steps=6, turn_dt=0.75, W=-0.05)
    def ub(t, c):
        F = c['F']; i = c['i']; bR, bL = bump(F, 'R', i), bump(F, 'L', i)
        d = dict(flex=6, crouch=0.065, knee_out=-1.6, lean=9 * (bR - bL), head_roll=-4 * (bR - bL), p_obl=4 * (bL - bR), head_yaw=ns['head_lead'](c, 10, .3))
        d.update(ns['arms_swing'](c, amp=8, abd=14, elbow=25)); return d
    return p, ub

def TA_def(ns):   # ataxia sensitiva (tabética): taloneante
    P = ns['Plan']; bump = ns['bump']; rnd = random.Random(3)
    st = dict(hs=26, to=26, flat_t=0.04, heeloff_t=0.16, swing_t=0.42, clear=0.11, clear_pow=0.7, circ=0.07, swing_pitch=-20, sway=0.04)
    p = P(st, y=2.0, psi=0.0, width=0.26)
    irr = lambda i, s: {'kL': rnd.uniform(0.8, 1.2), 'dlat': rnd.uniform(-0.05, 0.05), 'kT': rnd.uniform(0.9, 1.15)}
    rnd.seed(3); p.walk(8, 0.5, 0.66, mod=irr); p.turn(math.pi, 5, 0.7)
    rnd.seed(3); p.walk(8, 0.5, 0.66, mod=irr); p.turn(math.pi, 5, 0.7); p.pause(0.5)
    def ub(t, c):
        d = dict(flex=10, head_pitch=32, lean=2 * math.sin(t * 2.1))
        d.update(ns['arms_swing'](c, amp=10, abd=18, elbow=25)); return d
    return p, ub

def AN_def(ns):   # anserina (miopática, de pato)
    P = ns['Plan']; bump = ns['bump']
    st = dict(hs=10, to=22, flat_t=0.10, heeloff_t=0.16, swing_t=0.42, clear=0.03, swing_pitch=-3, sway=0.075)
    p = P(st, y=2.0, psi=0.0, width=0.20)
    ns['_route'](p, 9, 0.42, 0.62, turn_steps=4, turn_dt=0.65)
    def ub(t, c):
        F = c['F']; i = c['i']; bR, bL = bump(F, 'R', i), bump(F, 'L', i)
        d = dict(p_tilt=12, flex=-16, p_obl=-11 * bR + 11 * bL, lean=14 * bR - 14 * bL, head_roll=-6 * (bR - bL), p_rot=4 * ns['dfoot'](c) * 10, head_yaw=ns['head_lead'](c, 10, .4))
        d.update(ns['arms_swing'](c, amp=14, abd=12)); return d
    return p, ub

def AP_def(ns):   # apráxica / magnética (hidrocefalia normotensiva)
    P = ns['Plan']
    st = dict(strike='flat', strike_pitch=0, to=3, heeloff_t=0.05, flat_t=0.05, swing_t=0.36, clear=0.004, swing_pitch=0, sway=0.03, toe_out=14)
    p = P(st, y=2.0, psi=0.0, width=0.26)
    frz = dict(clear=0.002, swing_t=0.18, to=1)
    p.mark('i0'); p.inplace(6, 0.32, **frz); p.mark('i1')
    p.walk(18, 0.19, 0.55); p.turn(math.pi, 10, 0.55); p.inplace(4, 0.3, **frz); p.walk(18, 0.19, 0.55); p.turn(math.pi, 10, 0.55); p.pause(0.5)
    def ub(t, c):
        d = dict(flex=3, head_pitch=6, head_yaw=ns['head_lead'](c, 8, .3))
        d.update(ns['arms_swing'](c, amp=22, abd=10)); return d
    return p, ub

def CH_def(ns):   # coreica
    P = ns['Plan']; bump = ns['bump']; rnd = random.Random(11)
    st = dict(hs=14, to=26, flat_t=0.09, heeloff_t=0.18, swing_t=0.42, clear=0.04, swing_pitch=-4, sway=0.04)
    p = P(st, y=2.0, psi=0.0, width=0.14)
    irr = lambda i, s: {'kL': rnd.uniform(0.6, 1.3), 'dlat': rnd.uniform(-0.07, 0.07), 'kT': rnd.uniform(0.75, 1.4), 'style': dict(clear=rnd.choice([0.04, 0.04, 0.12]))}
    rnd.seed(11); p.walk(9, 0.48, 0.6, mod=irr); p.turn(math.pi, 4, 0.65)
    rnd.seed(11); p.walk(9, 0.48, 0.6, mod=irr); p.turn(math.pi, 4, 0.65); p.pause(0.5)
    T = p.t + 0.8
    N = {k: _pnoise(T, s) for s, k in enumerate(('ar', 'al', 'er', 'el', 'tr', 'tl', 'hd', 'hy', 'sh', 'kn', 'wr', 'wl', 'pr', 'pl'))}
    jerk = lambda f, t: max(-1.2, min(1.2, f(t))) ** 3
    def ub(t, c):
        d = dict(flex=4 + 6 * jerk(N['tr'], t), lean=8 * jerk(N['tl'], t), twist=10 * jerk(N['sh'], t), head_pitch=8 * jerk(N['hd'], t), head_yaw=18 * jerk(N['hy'], t),
                 head_roll=6 * jerk(N['tl'], t + .3), crouch=max(0, 0.04 * jerk(N['kn'], t)), shift=0.03 * jerk(N['tl'], t + .5))
        a = ns['arms_swing'](c, amp=14)
        a['arm_r'].update(flex=a['arm_r']['flex'] + 35 * jerk(N['ar'], t), abd=10 + 25 * abs(jerk(N['ar'], t + .2)), elbow=20 + 50 * abs(jerk(N['er'], t)), pron=40 * jerk(N['pr'], t), wrist=30 * jerk(N['wr'], t), mcp=20 + 30 * jerk(N['wr'], t + .1), ip=20)
        a['arm_l'].update(flex=a['arm_l']['flex'] + 35 * jerk(N['al'], t), abd=10 + 25 * abs(jerk(N['al'], t + .2)), elbow=20 + 50 * abs(jerk(N['el'], t)), pron=40 * jerk(N['pl'], t), wrist=30 * jerk(N['wl'], t), mcp=20 + 30 * jerk(N['wl'], t + .1), ip=20)
        d.update(a); return d
    return p, ub
