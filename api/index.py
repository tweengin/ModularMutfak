#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ModulerCraft Pro - Vercel Serverless Function Handler
Exposes ModulerCraftHandler for Vercel's Python serverless runtime.
"""

import sys
import os

# Add root project directory to sys.path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from server import ModulerCraftHandler

# Vercel's Python runtime discovers 'handler' class inheriting from BaseHTTPRequestHandler
class handler(ModulerCraftHandler):
    pass
