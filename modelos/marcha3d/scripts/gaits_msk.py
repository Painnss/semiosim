
import math
def _route(p, n, L, dt, mod=None, turn_steps=3, turn_dt=0.6, tmod=None, W=None):
    p.walk(n, L, dt, mod=mod, W=W); p.turn(math.pi, turn_steps, turn_dt, mod=tmod); p.walk(n, L, dt, mod=mod, W=W); p.turn(math.pi, turn_steps, turn_dt, mod=tmod); p.home(); p.pause(0.5)

def M1_def(ns):   # lumbociática derecha: marcha antálgica
    P = ns['Plan']; bump = ns['bump']
    st = dict(hs=12, to=28, flat_t=0.10, heeloff_t=0.18, swing_t=0.42, clear=0.025, swing_pitch=-3, sway=0.03)
    p = P(st, y=2.0, psi=0.0, width=0.11)
    p.side_style['R'] = dict(strike='flat', strike_pitch=0, to=10, heeloff_t=0.08)
    kt = lambda i, s: {'kT': 0.72 if s == 'L' else 1.28}
    _route(p, 8, 0.46, 0.6, mod=kt, turn_steps=4, turn_dt=0.7)
    def ub(t, c):
        d = dict(flex=12, lean=7, head_pitch=4, twist=0, p_rot=1, head_yaw=ns['head_lead'](c, 8, .3))
        d.update(ns['arms_swing'](c, amp=10, elbow=20)); return d
    return p, ub

def M2_def(ns):   # espondilitis anquilosante: marcha rígida
    P = ns['Plan']
    st = dict(hs=10, to=24, flat_t=0.10, heeloff_t=0.18, swing_t=0.40, clear=0.025, swing_pitch=-3, sway=0.02)
    p = P(st, y=2.0, psi=0.0, width=0.12)
    _route(p, 8, 0.45, 0.58, turn_steps=5, turn_dt=0.6)
    def ub(t, c):
        d = dict(flex=24, p_tilt=4, head_pitch=26, twist=0, p_rot=0, p_obl=0, head_yaw=0)
        d.update(ns['arms_swing'](c, amp=9, elbow=22)); return d
    return p, ub

def M3_def(ns):   # gonartrosis derecha
    P = ns['Plan']; bump = ns['bump']
    st = dict(hs=12, to=28, flat_t=0.10, heeloff_t=0.18, swing_t=0.44, clear=0.03, swing_pitch=-3, sway=0.025)
    p = P(st, y=2.0, psi=0.0, width=0.11)
    mod = lambda i, s: {'kT': 0.8 if s == 'L' else 1.2, 'kL': 0.88 if s == 'R' else 1.0}
    _route(p, 8, 0.5, 0.66, mod=mod, turn_steps=4, turn_dt=0.7)
    def ub(t, c):
        F = c['F']; i = c['i']
        d = dict(flex=4, crouch=0.012 + 0.035 * bump(F, 'L', i), head_yaw=ns['head_lead'](c), lean=-2 * bump(F, 'L', i))
        d.update(ns['arms_swing'](c, amp=24)); d.update({k: v for k, v in ns['pelvis_osc'](c, rot=7, obl=3).items()}); return d
    return p, ub

def M4_def(ns):   # rotura del LCA izquierdo
    P = ns['Plan']; bump = ns['bump']
    st = dict(hs=12, to=28, flat_t=0.10, heeloff_t=0.18, swing_t=0.44, clear=0.03, swing_pitch=-3, sway=0.025)
    p = P(st, y=2.0, psi=0.0, width=0.11)
    p.side_style['L'] = dict(strike='flat', strike_pitch=0, to=12)
    mod = lambda i, s: {'kT': 0.75 if s == 'R' else 1.25}
    tmod = lambda i, s: {'kT': 1.3 if i % 2 else 0.9}
    _route(p, 8, 0.48, 0.62, mod=mod, turn_steps=5, turn_dt=0.75, tmod=tmod)
    turns = []
    def ub(t, c):
        F = c['F']; i = c['i']; P_ = c['psis']; j = min(len(P_) - 1, i + 6)
        turning = min(1.0, abs(P_[j] - P_[i]) * 3)
        d = dict(flex=5, crouch=0.012 + 0.035 * bump(F, 'R', i), head_yaw=ns['head_lead'](c), lean=3 * bump(F, 'R', i) + 4 * turning * math.sin(t * 9),
                 shift=0.03 * turning * math.sin(t * 7))
        d.update(ns['arms_swing'](c, amp=20, abd=6 + 18 * turning)); return d
    return p, ub

def M8_def(ns):   # coxartrosis derecha: claudicante, Trendelenburg/Duchenne
    P = ns['Plan']; bump = ns['bump']
    st = dict(hs=12, to=26, flat_t=0.10, heeloff_t=0.18, swing_t=0.42, clear=0.03, swing_pitch=-3, sway=0.04)
    p = P(st, y=2.0, psi=0.0, width=0.12)
    p.side_style['R'] = dict(toe_out=22)
    mod = lambda i, s: {'kT': 0.72 if s == 'L' else 1.28, 'kL': 0.85 if s == 'R' else 1.0}
    _route(p, 8, 0.46, 0.62, mod=mod, turn_steps=4, turn_dt=0.7)
    def ub(t, c):
        F = c['F']; i = c['i']; bL = bump(F, 'L', i)      # balanceo izquierdo = apoyo monopodal derecho
        d = dict(flex=3, p_obl=9 * bL, lean=-16 * bL, head_roll=8 * bL, shift=-0.045 * bL, head_yaw=ns['head_lead'](c))
        d.update(ns['arms_swing'](c, amp=20)); d['arm_l']['abd'] = 6 + 14 * bL; return d
    return p, ub

def M7_def(ns):   # metatarsalgia: marcha conservada con despegue acortado
    P = ns['Plan']
    st = dict(hs=16, to=16, flat_t=0.09, heeloff_t=0.12, swing_t=0.40, clear=0.03, swing_pitch=-4, sway=0.02)
    p = P(st, y=2.0, psi=0.0, width=0.10)
    _route(p, 7, 0.6, 0.55, turn_steps=3, turn_dt=0.58)
    def ub(t, c):
        d = dict(flex=2, head_yaw=ns['head_lead'](c)); d.update(ns['arms_swing'](c, amp=28)); d.update(ns['pelvis_osc'](c)); return d
    return p, ub
