
import math
from mathutils import Vector
def fwd(psi): return Vector((math.sin(psi), -math.cos(psi), 0))
def bump(F, s, i):
    a = F[s][i]; return math.sin(math.pi * a[4]) if a[3] else 0.0
def dfoot(c):
    F = c['F']; i = c['i']; return (F['R'][i][0] - F['L'][i][0]).dot(fwd(c['psi']))
def head_lead(c, k=10, gain=0.6):
    P = c['psis']; i = c['i']; j = min(len(P) - 1, i + k); return math.degrees(P[j] - P[i]) * gain
def arms_swing(c, amp=32, ampR=None, ampL=None, elbow=14, abd=6):
    d = dfoot(c); aR = ampR if ampR is not None else amp; aL = ampL if ampL is not None else amp
    fr = -aR * d; fl = aL * d
    return {'arm_r': dict(flex=fr, elbow=elbow + max(0, fr) * .6, abd=abd), 'arm_l': dict(flex=fl, elbow=elbow + max(0, fl) * .6, abd=abd)}
def pelvis_osc(c, rot=11, obl=4.5, counter=0.7):
    d = dfoot(c); F = c['F']; i = c['i']
    pr = rot * d
    return dict(p_rot=pr, twist=-counter * pr * 1.6, p_obl=-obl * bump(F, 'R', i) + obl * bump(F, 'L', i))
