// Time ago function - handles datetime string
function timeAgo(input) {
  let timestamp;
  if (typeof input === 'string') {
    timestamp = new Date(input.replace(' ', 'T') + 'Z').getTime() / 1000;
  } else {
    timestamp = input;
  }
  const seconds = Math.floor((Date.now() / 1000) - timestamp);
  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Signal color based on uplink (handles large numbers)
function getSignalColor(uplink) {
  const val = parseInt(uplink) || 0;
  if (val > 1000000) return 'text-emerald-400';
  if (val > 100000) return 'text-amber-400';
  return 'text-red-400';
}

// Status icons renderer - adapted for local data format (1/0/null)
function renderStatusIcons(data) {
  let icons = '';
  icons += data.is_earning === 1 ? '<i class="fas fa-coins text-amber-400" title="Earning"></i>' : '<i class="fas fa-coins text-slate-600" title="Not Earning"></i>';
  icons += data.is_healthy === 1 ? '<i class="fas fa-heart text-emerald-400 ml-1.5" title="Healthy"></i>' :
    (data.is_healthy === 0 ? '<i class="fas fa-heart text-red-400 ml-1.5" title="Unhealthy"></i>' : '<i class="fas fa-heart text-slate-500 ml-1.5" title="Unknown"></i>');
  icons += data.is_whitelisted === 1 ? '<i class="fas fa-check-circle text-emerald-400 ml-1.5" title="Whitelisted"></i>' :
    (data.is_whitelisted === 0 ? '<i class="fas fa-times-circle text-red-400 ml-1.5" title="Delisted"></i>' : '<i class="fas fa-clock text-slate-500 ml-1.5" title="Pending"></i>');
  icons += '<i class="fas fa-server text-cyan-400 ml-1.5" title="Hosting"></i>';
  icons += `<i class="fas fa-signal ${getSignalColor(data.uplink)} ml-1.5" title="Uplink: ${data.uplink || 0}"></i>`;
  return `<div class="flex flex-nowrap whitespace-nowrap">${icons}</div>`;
}

// Initialize DataTable
let nodesTable;
let lastUpdateTime = null;
const REFRESH_INTERVAL = 30; // seconds

// Update the countdown display every second
function updateCountdownDisplay() {
  if (!lastUpdateTime) return;

  const now = Date.now();
  const secondsSinceUpdate = Math.floor((now - lastUpdateTime) / 1000);
  const secondsUntilNext = Math.max(0, REFRESH_INTERVAL - secondsSinceUpdate);

  $('#last-updated').text(`Updated: ${secondsSinceUpdate}s ago | Next: ${secondsUntilNext}s`);
}

// Mark the time of last refresh
function markRefreshTime() {
  lastUpdateTime = Date.now();
  updateCountdownDisplay();
}

// Start countdown ticker
setInterval(updateCountdownDisplay, 1000);

// Update all "last checked" times dynamically every second
function updateLastCheckedTimes() {
  $('.last-checked-time').each(function() {
    const timestamp = $(this).data('timestamp');
    if (timestamp) {
      $(this).text(timeAgo(timestamp));
    }
  });
}
setInterval(updateLastCheckedTimes, 1000);

// Main data refresh function
function refreshData() {
  // Fetch stats from local proxy
  fetch('proxy.php?type=stats')
    .then(res => res.json())
    .then(statsArray => {
      const stats = Array.isArray(statsArray) ? statsArray[0] : statsArray;
      $('#stat-active').text(stats.active_total || 0);
      $('#stat-users').text(stats.peers_total || 0);
      $('#stat-earning').text(stats.earning_total || 0);
      $('#stat-v2ray').text(stats.v2ray || 0);
      $('#stat-wireguard').text(stats.wireguard || 0);
      $('#stat-healthy').text(stats.healthy || 0);
      $('#stat-unhealthy').text(stats.unhealthy || 0);
      $('#stat-whitelisted').text(stats.whitelisted || 0);
      $('#stat-pending').text(stats.whitelist_pending || 0);
      $('#stat-delisted').text(stats.delisted || 0);
      $('#stat-hosting').text(stats.hosting || 0);
      $('#stat-residential').text(stats.residential || 0);

      // Update progress bars
      const total = (stats.v2ray || 0) + (stats.wireguard || 0);
      if (total > 0) {
        $('#bar-v2ray').css('width', ((stats.v2ray / total) * 100) + '%');
        $('#bar-wireguard').css('width', ((stats.wireguard / total) * 100) + '%');
      }

      const healthTotal = (stats.healthy || 0) + (stats.unhealthy || 0);
      if (healthTotal > 0) {
        $('#bar-health').css('width', ((stats.healthy / healthTotal) * 100) + '%');
      }

      const wlTotal = (stats.whitelisted || 0) + (stats.whitelist_pending || 0) + (stats.delisted || 0);
      if (wlTotal > 0) {
        $('#bar-whitelisted').css('width', ((stats.whitelisted / wlTotal) * 100) + '%');
        $('#bar-pending').css('width', ((stats.whitelist_pending / wlTotal) * 100) + '%');
      }

      const serverTotal = (stats.hosting || 0) + (stats.residential || 0);
      if (serverTotal > 0) {
        $('#bar-server').css('width', ((stats.hosting / serverTotal) * 100) + '%');
      }
    })
    .catch(err => console.error('Failed to load stats:', err));

  // Fetch nodes from local proxy
  fetch('proxy.php?type=data')
    .then(res => res.json())
    .then(data => {
      if (nodesTable) {
        // Update existing table
        nodesTable.clear().rows.add(data).draw(false); // false = preserve paging
      } else {
        // Initialize DataTable
        nodesTable = $('#nodes-table').DataTable({
          data: data,
          pageLength: 25,
          lengthMenu: [10, 25, 50, 100],
          order: [[3, 'desc']],
          language: {
            lengthMenu: 'Show _MENU_',
            info: 'Showing _START_ to _END_ of _TOTAL_ nodes',
            paginate: {
              first: '<i class="fas fa-angles-left"></i>',
              previous: '<i class="fas fa-angle-left"></i>',
              next: '<i class="fas fa-angle-right"></i>',
              last: '<i class="fas fa-angles-right"></i>'
            }
          },
          layout: {
            topStart: null, // Hide default page length
            topEnd: null // Hide default search
          },
          columns: [
            {
              data: 'address',
              render: function (data, type) {
                // Return full address for filtering/sorting
                if (type === 'filter' || type === 'sort') {
                  return data;
                }
                // Create multiple versions for responsive display
                const shortXs = data.substring(0, 8) + '...' + data.substring(data.length - 4);  // Very small screens
                const shortSm = data.substring(0, 12) + '...' + data.substring(data.length - 6); // Small/medium screens
                const shortLg = data.substring(0, 16) + '...' + data.substring(data.length - 8); // Large screens
                const full = data; // Extra large screens only
                return `
                  <div class="flex items-center gap-2 group">
                    <span class="font-mono text-sm text-slate-300 lg:hidden" title="${data}">${shortXs}</span>
                    <span class="font-mono text-sm text-slate-300 hidden lg:inline xl:hidden" title="${data}">${shortSm}</span>
                    <span class="font-mono text-sm text-slate-300 hidden xl:inline 2xl:hidden" title="${data}">${shortLg}</span>
                    <span class="font-mono text-sm text-slate-300 hidden 2xl:inline" title="${data}">${full}</span>
                    <button class="copy-btn opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-white focus:outline-none" data-address="${data}" title="Copy Address">
                      <i class="fas fa-copy"></i>
                    </button>
                  </div>
                `;
              }
            },
            {
              data: null,
              orderable: false,
              render: function (data) {
                return renderStatusIcons(data);
              }
            },
            {
              data: 'moniker',
              render: function (data) {
                return `<span class="font-medium text-white">${data || '—'}</span>`;
              }
            },
            {
              data: 'peers',
              className: 'text-center',
              render: function (data, type) {
                if (type === 'display') {
                  const color = data > 0 ? 'text-emerald-400' : 'text-slate-500';
                  return `<span class="font-mono ${color}">${data}</span>`;
                }
                return data;
              }
            },
            {
              data: null,
              render: function (data) {
                return `<span class="text-sm"><span class="text-slate-400">${data.country || '—'}</span> <span class="text-slate-500">• ${data.city || '—'}</span></span>`;
              }
            },
            {
              data: 'service_type',
              render: function (data) {
                let displayName, color;
                if (data === 'v2ray') {
                  displayName = 'V2Ray';
                  color = 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30';
                } else if (data === 'wireguard') {
                  displayName = 'WireGuard';
                  color = 'bg-red-500/20 text-red-400 border-red-500/30';
                } else {
                  displayName = data || 'null';
                  color = 'bg-slate-500/20 text-slate-400 border-slate-500/30';
                }
                return `<span class="inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${color}">${displayName}</span>`;
              }
            },
            {
              data: 'last_checked',
              render: function (data, type, row) {
                // Determine which check is more recent
                const lastCheckedTime = data ? new Date(data.replace(' ', 'T') + 'Z').getTime() : 0;
                const failedCheckTime = row.failed_check ? new Date(row.failed_check.replace(' ', 'T') + 'Z').getTime() : 0;
                
                // Use the more recent timestamp and determine if it was a failure
                const isFailed = failedCheckTime > lastCheckedTime;
                const displayTime = isFailed ? row.failed_check : data;
                
                if (type === 'sort') return displayTime;
                
                const ago = timeAgo(displayTime);
                const colorClass = isFailed ? 'text-red-400 hover:text-red-300' : 'text-emerald-400 hover:text-emerald-300';
                // Store timestamp in data attribute for dynamic updates
                const link = row.ip_port 
                  ? `<a href="http://${row.ip_port}" target="_blank" class="last-checked-time ${colorClass} transition-colors" data-timestamp="${displayTime}">${ago}</a>` 
                  : `<span class="last-checked-time ${colorClass}" data-timestamp="${displayTime}">${ago}</span>`;
                return `<span class="text-sm">${link}</span>`;
              }
            }
          ],
          drawCallback: function () {
            // Style DataTables elements after draw
            $('.dt-paging button').addClass('!bg-transparent !border-white/10 hover:!bg-white/10 !text-slate-400 hover:!text-white !transition-all');
            $('.dt-info').addClass('!text-slate-500');
          }
        });

        // Hide loading overlay
        $('#loading-overlay').fadeOut(300);
      }

      markRefreshTime();
    })
    .catch(err => {
      console.error('Failed to load nodes:', err);
      if (!nodesTable) {
        $('#loading-overlay').html('<div class="text-center"><i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i><p class="text-slate-400">Failed to load nodes. Please refresh.</p></div>');
      }
    });
}

$(document).ready(function () {
  // Initial load
  refreshData();

  // Auto-refresh every 30 seconds
  setInterval(refreshData, 30000);
  $.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
    if (!nodesTable) return true;
    const rowData = nodesTable.row(dataIndex).data();
    if (!rowData) return true;

    // Handle earning triple switch
    const earningFilter = $('#earning-switch').data('filter') || 'all';
    if (earningFilter === 'earning' && rowData.is_earning !== 1) return false;
    if (earningFilter === 'not-earning' && rowData.is_earning === 1) return false;

    if ($('#filter-healthy').is(':checked') && rowData.is_healthy !== 1) return false;
    if ($('#filter-whitelisted').is(':checked') && rowData.is_whitelisted !== 1) return false;
    if ($('#filter-residential').is(':checked') && rowData.is_residential !== 1) return false;

    return true;
  });

  // Bind earning triple switch
  $('.earning-option').on('click', function () {
    const value = $(this).data('value');
    const btn = $(this);
    $('#earning-switch').data('filter', value);

    // Update text colors
    $('.earning-option').removeClass('text-white').addClass('text-slate-400');
    btn.removeClass('text-slate-400').addClass('text-white');

    // Animate sliding indicator
    const indicator = $('#earning-indicator');
    const btnLeft = btn.position().left;
    const btnWidth = btn.outerWidth();

    indicator.css({
      'left': btnLeft + 2 + 'px',
      'width': btnWidth + 'px',
      'transform': 'none'
    });

    // Update indicator color
    if (value === 'earning') {
      indicator.removeClass('bg-slate-600 bg-red-500').addClass('bg-emerald-500');
    } else if (value === 'not-earning') {
      indicator.removeClass('bg-slate-600 bg-emerald-500').addClass('bg-red-500');
    } else {
      indicator.removeClass('bg-emerald-500 bg-red-500').addClass('bg-slate-600');
    }

    if (nodesTable) nodesTable.draw();
  });

  // Initialize indicator position on load
  setTimeout(function () {
    const allBtn = $('.earning-option[data-value="all"]');
    $('#earning-indicator').css({
      'left': allBtn.position().left + 2 + 'px',
      'width': allBtn.outerWidth() + 'px',
      'transform': 'none'
    });
  }, 100);

  // Bind filter toggles
  $('#filter-healthy, #filter-whitelisted, #filter-residential').on('change', function () {
    if (nodesTable) nodesTable.draw();
  });

  // Page length custom dropdown
  $('#page-length-btn').on('click', function (e) {
    e.stopPropagation();
    $('#page-length-menu').toggleClass('hidden');
  });

  $('.page-length-option').on('click', function () {
    const value = parseInt($(this).attr('data-value'), 10);
    $('#page-length-value').text(value);
    $('#page-length-menu').addClass('hidden');

    // Update active state
    $('.page-length-option').removeClass('text-purple-400 bg-white/5').addClass('text-slate-300');
    $(this).removeClass('text-slate-300').addClass('text-purple-400 bg-white/5');

    if (nodesTable) nodesTable.page.len(value).draw();
  });

  // Close dropdown when clicking outside
  $(document).on('click', function (e) {
    if (!$(e.target).closest('#page-length-wrapper').length) {
      $('#page-length-menu').addClass('hidden');
    }
  });

  // Bind custom search box
  $('#custom-search').on('input', function () {
    const val = this.value;
    if (nodesTable) nodesTable.search(val).draw();
    // Show/hide clear button
    if (val.length > 0) {
      $('#clear-search').removeClass('hidden');
    } else {
      $('#clear-search').addClass('hidden');
    }
  });

  // Bind clear search button
  $('#clear-search').on('click', function () {
    $('#custom-search').val('').trigger('input');
  });

  // Bind copy button
  $(document).on('click', '.copy-btn', function () {
    const address = $(this).data('address');
    const btn = $(this);
    const icon = btn.find('i');

    navigator.clipboard.writeText(address).then(() => {
      // Visual feedback
      icon.removeClass('fa-copy').addClass('fa-check text-emerald-400');
      setTimeout(() => {
        icon.removeClass('fa-check text-emerald-400').addClass('fa-copy');
      }, 1500);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  });
});