
import bpy, math, numpy as np
from mathutils import Vector, Quaternion, Matrix
FPS = 30
RIG = 'Human.rig'
SOLE = 0.017
KSIGN = {'l': -1, 'r': 1}
TSIGN = {'l': 1, 'r': -1}             # el zapato baja 1,7 cm bajo el tobillo de reposo
LOC = {'heel': Vector((0, 0.063, -SOLE)), 'ball': Vector((0, -0.123, -SOLE)), 'toe': Vector((0, -0.203, -SOLE))}

def Rz(a): return Quaternion((0, 0, 1), a)
def Rx(a): return Quaternion((1, 0, 0), a)
def Ry(a): return Quaternion((0, 1, 0), a)
D = math.radians
def fwd(psi): return Vector((math.sin(psi), -math.cos(psi), 0))
def rgt(psi): return Vector((-math.cos(psi), -math.sin(psi), 0))   # derecha del paciente
def smooth(a, sig):
    a = np.asarray(a, float)
    if sig <= 0: return a
    r = int(3 * sig) + 1; k = np.exp(-0.5 * (np.arange(-r, r + 1) / sig) ** 2); k /= k.sum()
    pad = np.concatenate([np.repeat(a[:1], r, 0), a, np.repeat(a[-1:], r, 0)])
    if a.ndim == 1: return np.convolve(pad, k, 'valid')
    return np.stack([np.convolve(pad[:, i], k, 'valid') for i in range(a.shape[1])], 1)
def ss(u): u = min(1, max(0, u)); return u * u * (3 - 2 * u)

class Rest:
    def __init__(s, rig):
        B = rig.data.bones
        s.R = {b.name: b.matrix_local.to_quaternion() for b in B}
        s.head = {b.name: b.head_local.copy() for b in B}
        s.parent = {b.name: (b.parent.name if b.parent else None) for b in B}
        s.l1 = (s.head['calf_l'] - s.head['thigh_l']).length
        s.l2 = (s.head['foot_l'] - s.head['calf_l']).length
        s.hang = {}
        for side in 'lr':
            for b in ('upperarm', 'lowerarm'):
                n = f'{b}_{side}'; d = (s.head[f'{"lowerarm" if b=="upperarm" else "hand"}_{side}'] - s.head[n]).normalized()
                s.hang[n] = d.rotation_difference(Vector((0, 0, -1)))
        s.knuckle = {}; s.thumbax = {}
        for side, sg in (('l', 1), ('r', -1)):
            k = (s.head[f'index_01_{side}'] - s.head[f'pinky_01_{side}']).normalized()
            s.knuckle[side] = k * KSIGN[side]
            s.thumbax[side] = (s.head[f'thumb_01_{side}'] - s.head[f'hand_{side}']).normalized().cross(k).normalized() * TSIGN[side]
        s.ankle_local = {}
        for side in 'lr':
            a = s.head[f'foot_{side}']; s.ankle_local[side] = Vector((0, 0, a.z))   # tobillo respecto del punto O (suelo bajo el tobillo)

def frame_from(dirv, fwdv):
    y = dirv.normalized(); z = (fwdv - fwdv.dot(y) * y).normalized(); x = y.cross(z)
    return Matrix((x, y, z)).transposed()
def seg_rot(rest_dir, rest_fwd, new_dir, new_fwd):
    return (frame_from(new_dir, new_fwd) @ frame_from(rest_dir, rest_fwd).transposed()).to_quaternion()

# ------------------------------------------------------------------ plan de pasos
class Plan:
    """Secuencia de apoyos. Cada apoyo: lado, instante de contacto, posición G del punto bajo el tobillo, orientación psi,
    y estilo del balanceo que lleva hasta él y de su apoyo."""
    def __init__(s, st, x=0.0, y=1.9, psi=0.0, width=0.09):
        s.st = st; s.t = 0.6; s.psi = psi; s.C = Vector((x, y, 0)); s.W = width
        s.feet = {'R': s.C + rgt(psi) * width / 2, 'L': s.C - rgt(psi) * width / 2}
        s.steps = []; s.next = 'R'; s.events = []
        s.init = {k: (v.copy(), psi) for k, v in s.feet.items()}
        s.side_style = {}; s.marks = {}
    def mark(s, name): s.marks[name] = s.t
    def step(s, side, G, psi, dt, **kw):
        s.t += dt
        kw = {**s.side_style.get(side, {}), **kw}
        s.steps.append(dict(side=side, t=s.t, G=G.copy(), psi=psi, **kw))
        s.feet[side] = G.copy(); s.next = 'L' if side == 'R' else 'R'
        s.C = (s.feet['R'] + s.feet['L']) / 2
    def walk(s, n, L, dt, W=None, mod=None, close=True):
        W = s.W if W is None else W
        for i in range(n):
            side = s.next; other = 'L' if side == 'R' else 'R'
            m = mod(i, side) if mod else {}
            psi = s.psi + m.get('dpsi', 0)
            base = s.feet[other] + rgt(s.psi) * (W if side == 'R' else -W) * (1 + m.get('dW', 0))
            G = base + fwd(psi) * (L * m.get('kL', 1)) + rgt(s.psi) * m.get('dlat', 0)
            if i == n - 1 and close:
                G = s.feet[other] + rgt(s.psi) * (W if side == 'R' else -W) + fwd(s.psi) * 0.0
            s.step(side, G, psi, dt * m.get('kT', 1), **m.get('style', {}))
            s.psi += m.get('dpsi_keep', 0)
    def turn(s, ang, n, dt, W=None, mod=None):
        W = s.W if W is None else W
        C = s.C.copy()
        for i in range(n):
            s.psi += ang / n
            side = s.next
            m = mod(i, side) if mod else {}
            G = C + rgt(s.psi) * ((W / 2) if side == 'R' else -W / 2) + fwd(s.psi) * m.get('adv', 0)
            s.step(side, G, s.psi, dt * m.get('kT', 1), **m.get('style', {}))
        # cierre: el otro pie alineado
        side = s.next; G = C + rgt(s.psi) * ((W / 2) if side == 'R' else -W / 2)
        s.step(side, G, s.psi, dt)
    def inplace(s, n, dt, **style):
        for i in range(n):
            side = s.next; s.step(side, s.feet[side].copy(), s.psi, dt, **style)
    def pause(s, dt): s.t += dt
    def home(s, dt=0.6):
        '''vuelve a colocar cada pie en su posición inicial (cierra el bucle)'''
        for _ in range(2):
            side = s.next; G0, p0 = s.init[side]
            if (s.feet[side] - G0).length > 0.02: s.step(side, G0, p0, dt)
            else: s.next = 'L' if side == 'R' else 'R'

# ------------------------------------------------------------------ evaluación de los pies
def foot_tracks(plan, T):
    """Para cada pie: lista de apoyos (t_contact, t_off, G, psi, estilos). Devuelve funciones de pose del pie por instante."""
    st = plan.st; tracks = {}
    for side in 'RL':
        G0, p0 = plan.init[side]
        c = [dict(t=-10, G=G0, psi=p0)] + [x for x in plan.steps if x['side'] == side]
        tracks[side] = c
    return tracks

def stance_pose(c, t, st, t_off, t_next_strike, side='R'):
    """pose del pie durante el apoyo c (desde su contacto hasta el despegue)."""
    S = {**st, **c}
    yaw = c['psi'] + D(S.get('toe_out', 0)) * (-1 if side == 'R' else 1)
    if 'stance_pitch' in S:      # marcha sobre talones (<0) o en puntas (>0): inclinación fija en todo el apoyo
        return dict(G=c['G'], psi=yaw, th=D(S['stance_pitch']), roll=D(S.get('roll', 0)), lift=0.0)
    th_hs = D(S.get('hs', 15)); th_to = D(S.get('to', 35))
    tc = c['t']; flat = tc + S.get('flat_t', 0.10)
    t_hoff = t_off - S.get('heeloff_t', 0.22)
    if t < flat:
        u = ss((t - tc) / max(1e-3, flat - tc)); th = -th_hs * (1 - u) if S.get('strike', 'heel') == 'heel' else D(S.get('strike_pitch', 0)) * (1 - u)
    elif t < t_hoff: th = 0.0
    else: th = th_to * ss((t - t_hoff) / max(1e-3, t_off - t_hoff))
    return dict(G=c['G'], psi=yaw, th=th, roll=D(S.get('roll', 0)), lift=0.0)

def foot_world(side, pose, rest):
    """posición del tobillo y rotación del pie a partir de G, psi, inclinación th (pivote talón si th<0, metatarso si th>0)."""
    q = Rz(pose['psi']) @ Rx(pose['th']) @ Ry(pose.get('roll', 0) * (-1 if side == 'R' else 1))
    pv = LOC['heel'] if pose['th'] < 0 else LOC['ball']
    qr = Rx(pose['th']) @ Ry(pose.get('roll', 0) * (-1 if side == 'R' else 1))
    def W(p): return pose['G'] + Vector((0, 0, SOLE + pose.get('lift', 0))) + (Rz(pose['psi']) @ (pv + qr @ (p - pv)))
    ankle = W(rest.ankle_local[side.lower()])
    pts = {k: W(v) for k, v in LOC.items()}
    return ankle, q, pts, pose['th']

def foot_state(side, t, plan, rest):
    st = plan.st; c = plan_tr[side]
    k = max(i for i in range(len(c)) if c[i]['t'] <= t) if t >= c[0]['t'] else 0
    cur = c[k]; nxt = c[k + 1] if k + 1 < len(c) else None
    if nxt is None:
        a, q, p, th = foot_world(side, stance_pose(cur, t, st, 1e9, 1e9, side), rest); return a, q, p, False, 0.0, th
    S = {**st, **nxt}
    sw = min(S.get('swing_t', 0.42), (nxt['t'] - cur['t']) * 0.92)
    t_off = nxt['t'] - sw
    if t < t_off:
        a, q, p, th = foot_world(side, stance_pose(cur, t, st, t_off, nxt['t'], side), rest); return a, q, p, False, 0.0, th
    # balanceo
    u = (t - t_off) / sw
    sp0 = stance_pose(cur, t_off, st, t_off, nxt['t'], side); sp1 = stance_pose(nxt, nxt['t'], st, 1e9, 1e9, side)
    a0, q0, p0, _ = foot_world(side, sp0, rest)
    a1, q1, p1, _ = foot_world(side, sp1, rest)
    us = ss(u)
    th_mid = D(S.get('swing_pitch', -5))       # inclinación del pie a mitad del balanceo (+ = punta abajo)
    th0 = sp0['th']; th1 = sp1['th']
    if u < 0.5: th = th0 + (th_mid - th0) * ss(u / 0.5)
    else: th = th_mid + (th1 - th_mid) * ss((u - 0.5) / 0.5)
    psi = sp0['psi'] + (sp1['psi'] - sp0['psi']) * us
    roll = D(S.get('roll_swing', 0))
    ank = a0.lerp(a1, us)
    ank.z += S.get('clear', 0.06) * math.sin(math.pi * min(1, u * S.get('clear_k', 1.0))) ** S.get('clear_pow', 1.0)
    lat = S.get('circ', 0.0) * math.sin(math.pi * u)            # circunducción: arco hacia afuera
    ank += rgt(psi) * (lat if side == 'R' else -lat)
    q = Rz(psi) @ Rx(th) @ Ry(roll * (-1 if side == 'R' else 1))
    # puntos del pie y suelo: si la punta queda bajo el suelo, el pie roza (se eleva lo justo)
    def P(p): return ank + (q @ (p - rest.ankle_local[side.lower()]))
    pts = {k: P(v) for k, v in LOC.items()}
    low = min(p.z for p in pts.values())
    if low < 0:
        ank.z -= low; pts = {k: P(v) for k, v in LOC.items()}
    return ank, q, pts, True, u, th

# ------------------------------------------------------------------ IK de dos huesos
def ik(H, A, l1, l2, pole):
    d = A - H; L = d.length
    L = min(max(L, abs(l1 - l2) + 1e-4), l1 + l2 - 1e-4)
    u = d.normalized(); a = (l1 * l1 - l2 * l2 + L * L) / (2 * L); h = math.sqrt(max(0, l1 * l1 - a * a))
    w = (pole - pole.dot(u) * u).normalized()
    K = H + u * a + w * h
    return K, H + u * L

plan_tr = {}
def bake(name, plan, ub, T_end=None):
    """ub(t, ctx) -> dict con la parte superior (ángulos en grados). Hornea la acción `name`."""
    global plan_tr
    rig = bpy.data.objects[RIG]; rest = Rest(rig); st = plan.st
    plan_tr = foot_tracks(plan, 0)
    T = (T_end or plan.t + 0.8)
    N = int(round(T * FPS)) + 1
    ts = np.arange(N) / FPS
    # 1) pies
    F = {s: [foot_state(s, t, plan, rest) for t in ts] for s in 'RL'}
    # 2) centro del cuerpo: punto medio de los apoyos, suavizado; balanceo lateral hacia el pie de apoyo
    mid = np.array([[((F['R'][i][0] + F['L'][i][0]) / 2)[k] for k in range(2)] for i in range(N)])
    swR = np.array([F['R'][i][4] if F['R'][i][3] else 0 for i in range(N)]) > 0
    swL = np.array([F['L'][i][4] if F['L'][i][3] else 0 for i in range(N)]) > 0
    load = np.where(swL, 1.0, np.where(swR, -1.0, 0.0))          # +1 carga en el derecho
    load = smooth(load, st.get('sway_sig', 4))
    # orientación: media de la de los pies (suavizada)
    psis = np.array([0.5 * (plan_tr['R'][0]['psi'] + plan_tr['L'][0]['psi'])] * N)
    def cur_psi(s, t):
        c = plan_tr[s]; k = max(i for i in range(len(c)) if c[i]['t'] <= t) if t >= c[0]['t'] else 0
        return c[k]['psi']
    psis = smooth(np.unwrap([0.5 * (cur_psi('R', t) + cur_psi('L', t)) for t in ts]), st.get('psi_sig', 6))
    mid = smooth(mid, st.get('mid_sig', 5))
    U = [ub(t, dict(i=i, load=load[i], psi=psis[i], F=F, ts=ts, psis=psis)) for i, t in enumerate(ts)]
    PEL = []
    for i in range(N):
        psi = psis[i]; u = U[i]
        Rgt = rgt(psi)
        xy = Vector((mid[i][0], mid[i][1], 0)) + Rgt * (st.get('sway', 0.022) * load[i]) + Rgt * u.get('shift', 0) + fwd(psi) * u.get('fshift', 0)
        PEL.append(xy)
    # 3) pelvis: rotaciones y altura limitada por el alcance de las piernas apoyadas
    Lr = (rest.l1 + rest.l2) * st.get('reach', 0.992)
    hipoff = {s: rest.head[f'thigh_{s}'] - rest.head['pelvis'] for s in 'lr'}
    Qp = []; zmax = []
    for i in range(N):
        u = U[i]; psi = psis[i]
        q = Rz(psi + D(u.get('p_rot', 0))) @ Rx(D(u.get('p_tilt', 0))) @ Ry(D(u.get('p_obl', 0)))
        Qp.append(q)
        z = 9.0
        for s in 'RL':
            ank, qf, pts, swing, uu, thf = F[s][i]
            if swing and uu > 0.02 and uu < 0.98: continue
            ho = q @ hipoff[s.lower()]
            hxy = PEL[i] + Vector((ho.x, ho.y, 0))
            dxy = (Vector((ank.x, ank.y, 0)) - hxy).length
            z = min(z, ank.z + math.sqrt(max(0.01, Lr * Lr - dxy * dxy)) - ho.z)
        zmax.append(z)
    zstand = min(zmax) if False else None
    zcap = np.array([rest.head['pelvis'].z + 0.04 - U[i].get('crouch', 0) for i in range(N)])
    zt = np.minimum(np.array(zmax), zcap)
    zs = np.minimum(smooth(zt, st.get('z_sig', 2.0)), np.array(zmax))
    for i in range(N): PEL[i].z = zs[i]
    # 4) huesos
    act = bpy.data.actions.get(name)
    if act: bpy.data.actions.remove(act)
    act = bpy.data.actions.new(name); act.use_fake_user = True
    rig.animation_data_create(); rig.animation_data.action = act
    pb = rig.pose.bones
    for b in pb: b.rotation_mode = 'QUATERNION'
    keyed = [b.name for b in pb]
    for i in range(N):
        u = U[i]; psi = psis[i]; Q = {'Root': Quaternion()}
        Q['pelvis'] = Qp[i]
        # columna: flexión, inclinación lateral y torsión repartidas
        cum = Quaternion()
        fl, la, tw = u.get('flex', 0), u.get('lean', 0), u.get('twist', 0)
        for k, (n, w) in enumerate((('spine_01', .3), ('spine_02', .3), ('spine_03', .4))):
            Q[n] = Rz(psi + D(u.get('p_rot', 0) * (1 - (k + 1) / 3) + tw * (k + 1) / 3)) @ Rx(D(u.get('p_tilt', 0) + fl * (k + 1) / 3 * (1 if k < 2 else 1))) @ Ry(D(la * (k + 1) / 3))
        chest = Q['spine_03']
        # cabeza: mirada (estabilizada en el mundo)
        hp = u.get('head_pitch', 0); hpsi = psi + D(u.get('head_yaw', 0))
        Q['neck_01'] = Rz(psi + D(tw + u.get('head_yaw', 0) * .4)) @ Rx(D(u.get('p_tilt', 0) + fl + (hp - fl - u.get('p_tilt', 0)) * .5)) @ Ry(D(la + u.get('head_roll', 0) * .5))
        Q['head'] = Rz(hpsi) @ Rx(D(hp)) @ Ry(D(u.get('head_roll', 0)))
        # brazos
        for s, sg in (('r', -1), ('l', 1)):
            a = u.get('arm_' + s, {})
            base = chest @ Rx(D(-a.get('flex', 0))) @ Ry(D(-sg * a.get('abd', 6))) @ Rz(D(-sg * a.get('irot', 0)))
            Q[f'clavicle_{s}'] = chest
            Q[f'upperarm_{s}'] = base @ rest.hang[f'upperarm_{s}']
            fa = base @ Rx(D(-a.get('elbow', 12))) @ Rz(D(-sg * a.get('pron', 0)))
            Q[f'lowerarm_{s}'] = fa @ rest.hang[f'lowerarm_{s}']
            kx = rest.knuckle[s]
            Q[f'hand_{s}'] = Q[f'lowerarm_{s}'] @ Quaternion(kx, D(a.get('wrist', 0)))
            f1, f2 = a.get('mcp', 8), a.get('ip', 10)
            for fn in ('index', 'middle', 'ring', 'pinky'):
                Q[f'{fn}_01_{s}'] = Q[f'hand_{s}'] @ Quaternion(kx, D(f1))
                Q[f'{fn}_02_{s}'] = Q[f'{fn}_01_{s}'] @ Quaternion(kx, D(f2))
                Q[f'{fn}_03_{s}'] = Q[f'{fn}_02_{s}'] @ Quaternion(kx, D(f2 * .8))
            th = a.get('thumb', 0); tx = rest.thumbax[s]
            Q[f'thumb_01_{s}'] = Q[f'hand_{s}'] @ Quaternion(tx, D(th * .4))
            Q[f'thumb_02_{s}'] = Q[f'thumb_01_{s}'] @ Quaternion(tx, D(th * .3))
            Q[f'thumb_03_{s}'] = Q[f'thumb_02_{s}'] @ Quaternion(tx, D(th * .3))
        # piernas por IK
        for S in 'RL':
            s = S.lower(); ank, qf, pts, swing, uu, thf = F[S][i]
            Hj = PEL[i] + Qp[i] @ hipoff[s]
            pole = fwd(psi) + rgt(psi) * (0.12 if S == 'R' else -0.12) * u.get('knee_out', 1)
            K, Ar = ik(Hj, ank, rest.l1, rest.l2, pole)
            restK, restH, restA = rest.head[f'calf_{s}'], rest.head[f'thigh_{s}'], rest.head[f'foot_{s}']
            Q[f'thigh_{s}'] = seg_rot(restK - restH, Vector((0, -1, 0)), K - Hj, pole)
            Q[f'calf_{s}'] = seg_rot(restA - restK, Vector((0, -1, 0)), Ar - K, pole)
            Q[f'foot_{s}'] = qf
            ext = 0.0
            if not swing:
                pass
            Q[f'ball_{s}'] = qf @ Rx(-max(0.0, thf) if not swing else D(-u.get('toe_' + s, 0)))
        # cuaterniones locales
        for n in keyed:
            if n not in Q: Q[n] = Q[rest.parent[n]] if rest.parent[n] in Q else Quaternion()
        for n in keyed:
            p = rest.parent[n]; Qpn = Q[p] if p else Quaternion()
            ql = rest.R[n].inverted() @ (Qpn.inverted() @ Q[n]) @ rest.R[n]
            pb[n].rotation_quaternion = ql
        # traslación de la pelvis (en su espacio de reposo)
        pb['pelvis'].location = rest.R['pelvis'].inverted() @ (PEL[i] - rest.head['pelvis'])
        for n in keyed:
            pb[n].keyframe_insert('rotation_quaternion', frame=i + 1)
        pb['pelvis'].keyframe_insert('location', frame=i + 1)
    act['duracion'] = N / FPS
    return act, N
