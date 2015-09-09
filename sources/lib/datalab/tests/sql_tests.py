# Copyright 2015 Google Inc. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#  http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import datetime as dt
import collections
import mock
import pandas
import unittest

# import Python so we can mock the parts we need to here.
import IPython
IPython.core.magic.register_line_cell_magic = mock.Mock()
IPython.core.magic.register_line_magic = mock.Mock()
IPython.core.magic.register_cell_magic = mock.Mock()
IPython.get_ipython = mock.Mock()

import gcp.datalab

class TestCases(unittest.TestCase):

  def __init__(self):
    pass
