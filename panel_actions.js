const cntrtn = 100;  //holds the number of matches returned by default by ancestrys api

var sampleresponse = {};  //object to store the testid information
var matchstorage = {}; //object to hold the matches
var procid;  // current testid being analyzed
const selectElement = document.getElementById('Test-select'); //location of the select element in html
var matchesurl = "";  // api url with the current testid included should drop this on cleanup
var icwurl = "";  //url to request the in common with matches for the current matchid
const ancurl = "https://www.ancestry.com/discoveryui-matchesservice/api/samples/";  //api url base
var counturl = "";  //url to request how many of each group of matches there are
var countresponse;  //raw object from the html request for number of counts
var scrapeurl = "";  //url for the match list
var pages = 0; // stores how many pages of matches for the current test
var scraperinc = 0; //increments the page number for every 20 match request
var matchwait = 0;  //flag we are waiting on matches from html request
var matchnum = 0;  //increments as we process more matches could use list.length instead
var matchlist = []; //array of just the matches not grouped by relationship
var errorinc = 0;  //incrments for error of html request
var treewait = 0;  //flag we are waiting for tree information responses
var treedata = {};
var treestorage = {};
var matchkey;
var treekey;
var icwwait = 0;
var icwinc = 0;
var icwlist = [];
var icwstorage ={};
var icwkey;
var icwpages = 0;
var icwcountwait = 0;
var expdata = [];
var matchcnt = 0;
var treecnt = 0;
var icwcnt = 0;
var icwaddnew = 0;  // flag to update the matches in common with the new match ids
var morematches = false;
var resumecnt = 0;

var testid = [];
var testname = [];
var relatresponse;
var cmresponse;
var sharedresponse;
var treeresponse;
var treeurlresponse;

chrome.storage.local.get('samples', function(result){
	sampleresponse.samples = result.samples;
	selectupdate();
})


document.getElementById('XXexpmButton').addEventListener("click", function () {
	if (procid != null){
		matchnum = 0;
		matchlist = [];
		var cntm = matchstorage[matchkey].length;
		var cntt = Object.keys(matchstorage[treekey]);
		if (cntt != null || cntt != undefined){
			cntt = cntt.length;
		} else {
			cntt = 0;
		}
		if (cntt == cntm){
			exportmatches();
		} else {
			alert("The match scan was incomplete.  Rerun the scan by pressing Scan Matches button and selecting Ok at the prompt.");
		}
	}
})

document.getElementById('XXcluButton').addEventListener("click", function () {
	if (procid != null){
		matchnum = 0;
		matchlist = [];
		//cluster();
		var cntm = matchstorage[matchkey].length;
		var cntt = Object.keys(matchstorage[treekey]);
		var cnti = Object.keys(matchstorage[icwkey]);
		if (cntt != null || cntt != undefined){
			cntt = cntt.length;
		} else {
			cntt = 0;
		}
		if (cnti != null || cnti != undefined){
			cnti = cnti.length;
		} else {
			cnti = 0;
		}
		if (cntt == cntm){
			if (cnti == cntm){
				cluster();
			} else {
				alert("The ICW scan is incomplete.  Either resume the failed scan, update ICW for newly scanned matcher, or rescan all ICW by pressing the scan ICW button");
			}
		} else {
			alert("The match scan was incomplete.  Rerun the scan by pressing Scan Matches button and selecting Ok at the prompt.");
		}
	}
})

// scrape button press
document.getElementById('XXscrapeButton').addEventListener("click", function () {
	if (procid != null){
		var tt;
		if (matchcnt > 0){
			tt = confirm("Matches have already been scanned for this test.  If you wish to rescan the matches press ok, otherwise press cancel.");
		} else {
			tt = true;
		}
		if (tt){
			matchstorage[matchkey] = [];
			chrome.storage.local.set(matchstorage);
	    	scrapeurl = matchesurl.concat("/matchesv2?closematchesfourthcousinorcloser=true&page=1");
			matchnum = 0;
			matchwait = 1;
			matchlist = [];
			scraperinc = 0;
			httpGetAsync(scrapeurl);
		}
	}
})

// scan icw button press
document.getElementById('XXicwButton').addEventListener("click", function () {
	if (procid != null){
		var tt;
		if (icwcnt > 0){
			tt = confirm("ICW data has already been saved for this test.  If you wish to redo the entire scan press confirm otherwise press cancel and click resume scan to update only new matches.");
		} else {
			tt = true; 
		}

		if (tt){
			matchstorage[icwkey] = {};
			chrome.storage.local.set(matchstorage);
			matchnum = 0;
			icwaddnew = 0;
			icwinc = 0;
			resumecnt = 0;
			icwlist = [];
			icwstorage = {};
			//var txt = procid.concat("-matches")
			if (matchstorage[matchkey] != undefined){
				for (i = 0; i < matchstorage[matchkey].length; i++){
					matchlist[i] = matchstorage[matchkey][i].testGuid;			
				}
			}
			icwcount();
		}
	}
})


document.getElementById('XXicwupButton').addEventListener("click", function () {
	if (procid != null){
	   // update ICW for new matches scanned

		var tt;
		if (icwcnt > 0){
			tt = confirm("If ICW was interrupted and no new matches have been scanned since the last attempt press Ok to continue.  Otherwise press cancel and use Scan new matches to update the ICW data.");
		} else {
			tt = true; 
		}
		if (tt){
			if (matchstorage[matchkey] != undefined){
				for (i = 0; i < matchstorage[matchkey].length; i++){
					matchlist[i] = matchstorage[matchkey][i].testGuid;			
				}
			}
			var storedkeys = Object.keys(matchstorage[icwkey]);
			if (matchlist.length > storedkeys.length){
				let difference = matchlist.filter(x => !storedkeys.includes(x));
				//console.log(difference)
				matchnum = 0;
				matchlist = difference;
				resumecnt = storedkeys.length;
				icwinc = 0;
				icwlist = [];
				icwstorage = {};
				icwcount();
			}
		}

	}
})



document.getElementById('XXicwsnButton').addEventListener("click", function () {
	if (procid != null){
	   // update ICW for new matches scanned

		var tt;
		if (icwcnt > 0){
			tt = confirm("If you wish to update the ICW data for only new matches scanned press Ok to continue.");
		} else {
			tt = true; 
		}
		if (tt){
			if (matchstorage[matchkey] != undefined){
				for (i = 0; i < matchstorage[matchkey].length; i++){
					matchlist[i] = matchstorage[matchkey][i].testGuid;			
				}
			}
			var storedkeys = Object.keys(matchstorage[icwkey]);
			if (matchlist.length > storedkeys.length){
				let difference = matchlist.filter(x => !storedkeys.includes(x));
				console.log(difference)
				matchnum = 0;
				matchlist = difference;
				resumecnt = storedkeys.length;
				icwinc = 0;
				icwlist = [];
				icwstorage = {};
				icwaddnew = 1;
				icwcount();
			}
		}

	}
})



document.getElementById('Test-select').onchange = function() {testchange()};


document.getElementById('XXfilter').addEventListener("click", function () {
	httpGetAsync(ancurl);  //get test ids
})


document.getElementById('XXcButton').addEventListener("click", function () {
	if (procid != null){
	   // update ICW for new matches scanned
		matchnum = 0;
		matchlist = [];
		var cntm = matchstorage[matchkey].length;
		var cntt = Object.keys(matchstorage[treekey]);
		if (cntt != null || cntt != undefined){
			cntt = cntt.length;
		} else {
			cntt = 0;
		}
		if (cntt == cntm){
			exportsep();
		} else {
			alert("The match scan was incomplete.  Rerun the scan by pressing Scan Matches button and selecting Ok at the prompt.");
		}
	}
})

function cluster(){
	//console.log(matchlist)
	var ll = matchlist;
	var mm = {};
	var filteredlist = [];
	var mfilteredlist = [];
	var keysSorted = [];
	var mincm = document.getElementById("XXmincm").value;
	console.log(mincm)
	var maxcm = document.getElementById("XXmaxcm").value;
	var perc = document.getElementById("XXperc").value;
	var numc = document.getElementById("XXnumc").value;

	if (matchstorage[matchkey] != null || matchstorage[matchkey] != undefined){
		var cnticw = Object.keys(matchstorage[icwkey]);
		var cnttree = Object.keys(matchstorage[treekey]);
		if (cnttree.length != matchstorage[matchkey].length){
			console.log("Tree Information scan is not complete rerun scan matches")
			return;
		}
		if (cnticw.length == matchstorage[matchkey].length){
		for (i = 0; i < matchstorage[matchkey].length; i++){
			matchlist[i] = matchstorage[matchkey][i].testGuid;
			var oo;
			oo = matchstorage[matchkey][i].relationship.sharedCentimorgans;
			if (oo <= maxcm && oo >= mincm){
				filteredlist.push(matchlist[i]);
			}
			if (oo <= maxcm){
				mfilteredlist.push(matchlist[i]);
			}			
		}
	
	
	var ii = 0;
	var clumap = [];
	var grp = {};
	var ppp = [];
	var nn = filteredlist;
	var fclumap = [];
	for (jj = 0; jj < nn.length; jj++){
		var clu = {};
		var fclu = {};
		var oo = matchstorage[icwkey][nn[ii]];
		clu[nn[ii]] = 1000 + jj;
		fclu[nn[ii]] = 1000 + jj;
		grp[nn[ii]] = "X";
		for (j=0;j<oo.length;j++){
			if (nn.includes(oo[j])){
				clu[oo[j]] = 1000+jj;
				grp[oo[j]] = "X";
				fclu[oo[j]] = 1000+jj;				
			} else if(mfilteredlist.includes(oo[j])){  //filter max from output
				clu[oo[j]] = 1000+jj;
			}	
		}
		var pp = [];
		var fpp = [];
		for (i=0; i<ll.length;i++){
			if (clu[ll[i]] >= 1000){
				pp[i] = clu[ll[i]];
				//ppp[i] = grp[nn[i]];
			} else {
				pp[i] = "";
				//ppp[i] = "";
			}
		}
		for (i=0; i<nn.length;i++){
			if (clu[nn[i]] >= 1000){
				ppp[i] = grp[nn[i]];
				fpp[i] = fclu[nn[i]];
			} else {
				pp[i] = "";
				fpp[i] = "";
				//ppp[i] = "";
			}
		}
		clumap[jj] = pp;
		fclumap[jj] = fpp;
		for (i=ii; i<nn.length; i++){
			if (ppp[i] != "X"){
				ii = i;
				i = nn.length;
			} else if (i == nn.length-1){
				jj = nn.length;
			} 
			
		}

	}

// create table of cluster groups with memmber ids.
	var clustertable = [];
	var x = clumap.length;
	for (i = 0; i < x; i++){
		var pp = [];
		for (j = 0; j < matchlist.length; j++){
			if (clumap[i][j] == 1000 + i){
				pp.push(matchlist[j]);
			}
		}
		clustertable[i]=pp;
	}

	var fclustertable = [];
	var x = fclumap.length;
	for (i = 0; i < x; i++){
		var pp = [];
		for (j = 0; j < filteredlist.length; j++){
			if (fclumap[i][j] == 1000 + i){
				pp.push(filteredlist[j]);
			}
		}
		fclustertable[i]=pp;
	}

// create array that has all ids for cluster members and their icw matches
// add minimum number of icw occurances filter default = 2
	var cmatchtable = [];
	var cstrtable = [];
	var cstrarray = [];
	var x = clustertable.length;
	var nclu = 0;
	var ccnt = x;
	var fcnt = 0;
	for (i = 0; i < x; i++){
		var cmatchlist = [];
		var cmatchkeys = {};
		var cfilterkeys = {};
		var cstrlist = [];
		var z = clustertable[i].length;
		for (j = 0; j < z; j++){
			var mm = clustertable[i][j];
			var y = matchstorage[icwkey][mm].length;
			for (k = 0; k < y; k++){
				var oo = matchstorage[icwkey][mm][k];
				var cc = cmatchkeys[oo];
				if (clustertable[i].includes(oo)){   //only include less than max filter

				
					if (cc == undefined){
						cmatchkeys[oo] = 1;
					} else {
						cmatchkeys[oo] = cmatchkeys[oo] + 1;
					}
				}
			}
			
		}
		

		// filter cluster with min matches in common
		/////////////////////////////////////////////
		////////////////////////////////////////////
		/////////////////////////////////////////////
		var ooo = Object.keys(cmatchkeys).length;
		var pct = perc/100 * ooo;

		for (j=0; j<matchlist.length; j++){
			var vv = cmatchkeys[matchlist[j]];
			if (cmatchkeys[matchlist[j]] >= pct){  // change 2 to variable set by page element filter
				cmatchlist.push(matchlist[j]);
				cstrlist.push(cmatchkeys[matchlist[j]]);  
			} else {
				delete cmatchkeys[matchlist[j]];
			}
		}
		var kk = Object.keys(cmatchkeys);
		if (kk.length > numc){
			keysSorted[nclu] = Object.keys(cmatchkeys).sort(function(a,b){return cmatchkeys[b]-cmatchkeys[a]});
			cmatchtable[nclu] = cmatchlist;
			cstrtable[nclu] = cstrlist;
			cstrarray[nclu] = cmatchkeys; 
			nclu = nclu + 1;
		}
		fcnt = nclu;
	}




// create matrix of each cluster that shows all ICW 

// array of table, each table represents a cluster
// each cluster row/column are the matches in common to this cluster with minimum filter number in common default 2
	cmatchtable = [];
	cmatchtable = keysSorted;

	var clusterarray = [];
	var x = cmatchtable.length;
	for (i = 0; i < x; i++){
		var keyedmatchlist = {};
		var z = cmatchtable[i].length;
		for (j = 0; j < z; j++){
			var keyedmatchrow = {};
			var mm = cmatchtable[i][j];
			for (k = 0; k < z; k++){
				var nn = cmatchtable[i][k];
				keyedmatchrow[nn] = "";
			}
			var y = matchstorage[icwkey][mm].length;
			for (k = 0; k < y; k++){
				var oo = matchstorage[icwkey][mm][k];
				var sval = cstrarray[i][oo];
				if (sval != undefined || sval != null){
					sval = sval.toString();
				} else {
					sval = "";
				}
				keyedmatchrow[oo] = sval;
			}
			keyedmatchlist[mm] = keyedmatchrow;
		}
		clusterarray[i] = keyedmatchlist;

	}


// create list of usernames keyed to testid
	var matchnamelist = {};	
	for (i=0; i<matchlist.length; i++){
		matchnamelist[matchlist[i]] = matchstorage[matchkey][i].displayName;
	}

// export cluster matrix table as csv
	expdata = [];

	// create empty array of arrays length of the data;
	for (h = 0; h < cmatchtable.length; h++){
		var hh = cmatchtable[h].length

		for (i = 0; i < cmatchtable[h].length+4; i++){
			expdata.push([]);
		}
	}
	var x = cmatchtable.length;
	var jj = 0;
	for (i = 0; i < x; i++){
		var y = cmatchtable[i].length;
		for (j = 0; j < y; j++){
			var pp = cmatchtable[i][j];
			var murl = "https://www.ancestry.com/discoveryui-matches/compare-ng/";
			murl = murl.concat(procid,"/with/",pp);
			expdata[jj][j+3]=matchnamelist[pp];
			expdata[jj+j+1][0]=murl;
			expdata[jj+j+1][1]=matchnamelist[pp];
			var txt = "=hyperlink(A";
			txt = txt.concat(jj+j+2,",B",jj+j+2,")");
			expdata[jj+j+1][2]= txt;
		}
		
		for (h = 0; h < y; h++){
			var mm = cmatchtable[i][h];
			for (j = 0; j < y; j++){
				var nn = cmatchtable[i][j];
				var nnn = clusterarray[i][mm][nn];
				expdata[jj+h+1][j+3] = clusterarray[i][mm][nn];
			}
		}
		jj = jj + j + 4;
	}

	var csv = [];
   	var end = expdata.length;
   	for (var j = 0; j < end; j++) {
		var item1 = expdata[j];
   		var row = [];
		//row.push(j + 1);
		for (var i = 0; i < item1.length; i++) {
			var c = item1[i];
			if(c == null || c == undefined){
				c = '';
			}
			else if(c != ''){
				c = c.replace(/"/g, '""');
        	    if(c.search(/("|,|\n)/g) >= 0){
        	        c = '"' + c + '"';
        	    }
			}
			row.push(c);
		}
		csv.push(row.join(','))
	}

//  export xml format worksheets
	var xmlout = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
	xmlout = xmlout.concat('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">');
	xmlout = xmlout.concat('<Styles><Style ss:ID="s62"><Alignment ss:Vertical="Center" ss:Horizontal="Center" ss:Rotate="-90"/></Style>');
	xmlout = xmlout.concat('<Style ss:ID="s65"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><NumberFormat ss:Format="0;\-0;;@"/></Style></Styles>');

	var x = cmatchtable.length;
	var jj = 0;
	var ii = 0;
	for (i = 0; i < x; i++){
		expdata = [];
		for (j = 0; j < cmatchtable[i].length+1; j++){
			expdata.push([]);
		}
		var y = cmatchtable[i].length;
		for (j = 0; j < y; j++){
			var pp = cmatchtable[i][j];
			var murl = "https://www.ancestry.com/discoveryui-matches/compare-ng/";
			murl = murl.concat(procid,"/with/",pp);
			haspublic = matchstorage[treekey][pp].publicTree;
			hasprivate = matchstorage[treekey][pp].privateTree;
			sizetree = matchstorage[treekey][pp].treeSize;
			comanc = matchstorage[treekey][pp].commonAncestors;
			var ttxt = "";
			if (comanc){
				ttxt = "Common Ancestor: "
			}
			if (haspublic){
				ttxt = ttxt.concat("Public Tree");
				if (sizetree != null || sizetree != undefined){
					ttxt = ttxt.concat(": ", sizetree.toString());
				}
			} else if (hasprivate){
				ttxt = ttxt.concat("Private Tree");
				if (sizetree != null || sizetree != undefined){
					ttxt = ttxt.concat(": ", sizetree.toString());
				}
			} else {
				ttxt = "No Tree";
			}
			expdata[jj][j+3]=matchnamelist[pp];
			expdata[jj+j+1][0]=murl;
			expdata[jj+j+1][1]=ttxt;
			var txt = murl.concat('"><Data ss:Type="String">',matchnamelist[pp]);
			//txt = txt.concat(jj+j+2,",B",jj+j+2,")");
			expdata[jj+j+1][2]= txt;
		}
		
		for (h = 0; h < y; h++){
			var mm = cmatchtable[i][h];
			for (j = 0; j < y; j++){
				var nn = cmatchtable[i][j];
				var nnn = clusterarray[i][mm][nn];
				expdata[jj+h+1][j+3] = clusterarray[i][mm][nn];
				if (h == j){
					expdata[jj+h+1][j+3] = "--";	
				}
			}
		}

		if (y != 0){
			// begin the worksheet / row / cell output
			ii = ii + 1;
			xmlout = xmlout.concat('<Worksheet ss:Name="Cluster ',ii,'"><Table>');
			xmlout = xmlout.concat('<Column ss:Hidden="1" ss:AutoFitWidth="0" ss:Span="0"/>'); //hide first column
			xmlout = xmlout.concat('<Column ss:Index="3" ss:StyleID="s65" ss:Width="105"/>');
			xmlout = xmlout.concat('<Column ss:StyleID="s65" ss:Width="19.5" ss:Span="',expdata[0].length,'"/>');
			xmlout = xmlout.concat('<Row ss:Height="105" ss:StyleID="s62">');
			for (j = 0; j < expdata[0].length; j++){
				if (expdata[0][j] == undefined){
					xmlout = xmlout.concat('<Cell><Data ss:Type="String">','</Data></Cell>');
				} else {
					xmlout = xmlout.concat('<Cell><Data ss:Type="String">',expdata[0][j],'</Data></Cell>');
				}
			}
	
			xmlout = xmlout.concat('</Row>');		

			for (k = 1; k < expdata.length; k++){
				xmlout = xmlout.concat('<Row>')
				for (j = 0; j < expdata[k].length; j++){
					if (expdata[k][j] == undefined){
						xmlout = xmlout.concat('<Cell><Data ss:Type="String">','</Data></Cell>');
					} else {
						if (j == 2){
							xmlout = xmlout.concat('<Cell ss:HRef="',expdata[k][j],'</Data></Cell>');
							//xmlout = xmlout.concat('<Cell><Data ss:Type="String">',expdata[k+1][j],'</Data></Cell>');
						} else if (j > 2 && expdata[k][j] == "--"){
							xmlout = xmlout.concat('<Cell><Data ss:Type="String">',expdata[k][j],'</Data></Cell>');
						} else if (j > 2 ){//}&& expdata[k][j] != ""){
							xmlout = xmlout.concat('<Cell><Data ss:Type="Number">',expdata[k][j],'</Data></Cell>');
						} else {
							xmlout = xmlout.concat('<Cell><Data ss:Type="String">',expdata[k][j],'</Data></Cell>');
						}
					}
				}
				xmlout = xmlout.concat('</Row>');
			}
			xmlout = xmlout.concat('</Table></Worksheet>')		
		}
	}
	xmlout = xmlout.concat('</Workbook>');
		

	var blob = new Blob([xmlout], { type: 'text/csv;charset=utf-8' });
   	var link = document.createElement("a");
   	if (link.download !== undefined) { // feature detection
    // Browsers that support HTML5 download attribute
   	var url = URL.createObjectURL(blob);
       	link.setAttribute("href", url);
       	link.setAttribute("download", 'icw-clusters.xml');
       	link.style.visibility = 'hidden';
       	document.body.appendChild(link);
       	link.click();
       	document.body.removeChild(link);	   	
	}
	
	var mtxt = "Found ";
	mtxt = mtxt.concat(ccnt, " clusters and exported ", fcnt, " filtered clusters");
	alert(mtxt);

	} else {
		console.log("ICW match scan is incomplete")
	}

	} else {
		console.log("No matches scanned")
	}

}

function storeerror(){
	console.log("WTF")
}

function treeinfo()
{
	// start by creating array of all the match ids
	var m = [];
	for (i = 0; i < 50; i++){
		if (i+matchnum < matchlist.length){
			m[i] = matchlist[i + matchnum];	
		}
	}
	if (m.length > 0){
		var txt = JSON.stringify(m);
		scrapeurl = ancurl.concat(procid,"/matchesv2/additionalInfo?ids=",txt,"&tree=true&ancestors=true");
		//console.log(scrapeurl)
		treewait = 1;
		httpGetAsync(scrapeurl);
	}
}


function scraper()
{
	for (j = 0; j < matchrawdata.matchGroups.length; j++){
		for (k = 0; k < matchrawdata.matchGroups[j].matches.length; k++){
			matchlist[matchnum] = matchrawdata.matchGroups[j].matches[k];
			matchnum = matchnum + 1;
			 
		}
	}
	document.getElementById('statusDisplay').innerHTML = matchnum;
	//var txt = procid.concat("-matches");
	matchstorage[matchkey] = matchlist;
	//chrome.storage.local.set(matchstorage);
	if (matchnum % 1000 == 0){
        chrome.storage.local.set(matchstorage);
    }
	
	morematches = matchrawdata.bookmarkData.moreMatchesAvailable;
	
	if (morematches == true){ //pages
		scraperinc = scraperinc + 1;
		var z = scraperinc + 1;
		scrapeurl = matchesurl.concat("/matchesv2?");
		z = JSON.stringify(matchrawdata.bookmarkData);
		scrapeurl = scrapeurl.concat("closematchesfourthcousinorcloser=true&bookmarkdata=",z);
		matchwait = 1;
		errorinc = 0;
		httpGetAsync(scrapeurl);	
	} 
	else
	{
		matchstorage[treekey] = {};
		chrome.storage.local.set(matchstorage);
		matchnum = 0;
		scraperinc = 0;
		matchlist = [];
		treedata = {};
		if (matchstorage[matchkey] != undefined){
			for (i = 0; i < matchstorage[matchkey].length; i++){
				matchlist[i] = matchstorage[matchkey][i].testGuid;			
			}
		}
    	treeinfo();

	}
	
}


function testchange()
{
	procid = selectElement.value;
	matchstorage = {};
	//document.getElementById('icwcmDisplay').innerHTML = "";
	matchesurl = "";
	icwurl = "";
	sampleresponse = {};
	counturl = "";
	countresponse = "";
	scrapeurl = "";
	pages = 0;
	scraperinc = 0;
	matchwait = 0;
	matchnum = 0;
	matchlist = [];
	errorinc = 0;  
	treewait = 0;  
	treedata = {};
	treestorage = {};
	matchkey = "";
	treekey = "";
	icwwait = 0;
	icwinc = 0;
	icwlist = [];
	icwstorage ={};
	icwkey = "";
	icwpages = 0;
	icwcountwait = 0;
	expdata = [];
	matchcnt = 0;
	treecnt = 0;
	icwcnt = 0;
	icwaddnew = 0; 
	morematches = false;
	resumecnt = 0;
	
	if (procid != ""){
		matchkey = procid.concat("-matches");	
		chrome.storage.local.get(matchkey, function(result){
		matchstorage[matchkey] = [];
		matchstorage[matchkey] = result[matchkey];
		if (matchstorage[matchkey] != undefined){
			var n = matchstorage[matchkey].length;
		} else {
			n = 0;
		}
		document.getElementById('statusDisplay').innerHTML = n;
		matchcnt = n;
	})

		treekey = procid.concat("-tree");	
		chrome.storage.local.get(treekey, function(result){
		matchstorage[treekey] = [];
		matchstorage[treekey] = result[treekey];
		if (matchstorage[treekey] != undefined){
			var z = Object.keys(matchstorage[treekey]);
			var n = z.length;
		} else {
			n = 0;
		}
		document.getElementById('treeDisplay').innerHTML = n;
		treecnt = n;
	})

		icwkey = procid.concat("-icw");	
		chrome.storage.local.get(icwkey, function(result){
		matchstorage[icwkey] = [];
		matchstorage[icwkey] = result[icwkey];
		if (matchstorage[icwkey] != undefined){
			var z = Object.keys(matchstorage[icwkey]); 
			var n = z.length;
		} else {
			n = 0;
		}
		document.getElementById('icwDisplay').innerHTML = n;
		icwcnt = n;
	})
	//chrome.storage.local.set(matchstorage);
	matchesurl = ancurl.concat(procid);
	counturl = matchesurl.concat("/matchlist/counts?relationsampleid=",procid);
	httpGetAsync(counturl)
	//console.log(procid)

	}
}



function httpGetAsync(theUrl)
{
    
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4){
        	if (xmlHttp.status == 200){
        		var n = xmlHttp.responseURL;
            	var httpresponse = xmlHttp.responseText;
            	//var n = theUrl.endswith("counts");
            	if (counturl == n && httpresponse != null){
            		//console.log(httpresponse)
            		counts = JSON.parse(httpresponse);
            		pages = counts.close;
            		document.getElementById('matchesDisplay').innerHTML = pages; 
            		pages = Math.ceil(pages / cntrtn);
            		console.log(pages)

	            }
    	        if (ancurl == n && httpresponse != null){
        	    	//console.log(httpresponse)
            		sampleresponse = JSON.parse(httpresponse);
            		chrome.storage.local.set(sampleresponse);
            		selectupdate();
            	}
	            if (n.includes("closematchesfourthcousinorcloser") && matchwait == 1 && httpresponse != null){
    	        	//console.log(httpresponse)
        	    	matchrawdata = JSON.parse(httpresponse);
            		matchwait = 0;
            		scraper();
        	    }
        	    if (n.includes("additionalInfo") && treewait == 1 && httpresponse != null){
        	    	var temp = JSON.parse(httpresponse);
        	    	var x = temp.length
        	    	for (i = 0; i < x; i++){
        	    		var nn = temp[i].testGuid;
        	    		treedata[nn] = temp[i];
        	    		matchnum = matchnum + 1;
        	    	}
        	    	document.getElementById('treeDisplay').innerHTML = matchnum;
        	    	treewait = 0;
        	    	errorinc = 0;
        	    	if (matchnum < matchlist.length){
        	    		var txt = procid.concat("-tree");
        	    		var m = {};
        	    		m = matchstorage[txt];
        	    		matchstorage[txt] = Object.assign(treedata,m);
        	    		if (matchnum % 500 == 0){
        					chrome.storage.local.set(matchstorage);
    					}
        	    		treeinfo(); 
        	    	} else {
        	    		var txt = procid.concat("-tree");
        	    		var m = {};
        	    		m = matchstorage[txt];
        	    		matchstorage[txt] = Object.assign(treedata,m);
        	    		chrome.storage.local.set(matchstorage); 
        	    		alert("Your match scan is complete.  You may now scan your in common with matches.");       	    		
        	    	}
        	    	
        	    }
        	    if (icwwait == 1 && httpresponse != null){
        	    	matchrawdata = JSON.parse(httpresponse);
            		icwwait = 0;
            		//setTimeout(icwinfo, 500);
            		icwinfo();
        	    }
        	} else {
        		var n = xmlHttp.responseURL;
        		htmlerror(n);
            }
        }           
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    //xmlHttp.withCredentials = true;

    xmlHttp.send(null);
}

function htmlerror(theUrl)
{
	console.log('HTML Request error')
	console.log(theUrl)
	if (errorinc < 2) {
		errorinc = errorinc + 1;	
		httpGetAsync(theUrl);	
	} else {
		alert("There was an error communicating with Ancestry Server try your scan again");
	}
}




function exportmatches(){
	var keyedmatchlist = {};
	expdata = [];
	//var keyedmatchrow = {};
	if (matchstorage[matchkey] != undefined){
		var z = matchstorage[matchkey].length;
		var cnttree = Object.keys(matchstorage[treekey]);
		if (cnttree.length != z){
			console.log("Tree Information scan is not complete rerun scan matches")
			return;
		}
		// initialize array or arrays
		for (i = 0; i < z+1; i++){
			expdata[i] = [];
		}
		expdata[0][0] = "Match User ID";
		expdata[0][1] = "Match Name";
		expdata[0][2] = "Match Initials";
		expdata[0][3] = "Match Profile ID";
		expdata[0][4] = "Match Gender";
		expdata[0][5] = "Match Photo URL";
		expdata[0][6] = "Admin Name";
		expdata[0][7] = "Admin Profile ID";
		expdata[0][8] = "Relationship Group";
		expdata[0][9] = "Shared CM";
		expdata[0][10] = "Shared Segments";
		expdata[0][11] = "Confidence";
		expdata[0][12] = "Starred";
		expdata[0][13] = "Viewed";
		expdata[0][14] = "Common Ancestor";
		expdata[0][15] = "No Trees";
		expdata[0][16] = "Private Tree";
		expdata[0][17] = "Public Tree";
		expdata[0][18] = "Linked Tree ID";
		expdata[0][19] = "Tree Size";
		expdata[0][20] = "Unlinked Tree";
		expdata[0][21] = "Tree Match ID"
		expdata[0][22] = "Note";		
		expdata[0][23] = "1000";
		expdata[0][24] = "1001";
		expdata[0][25] = "1002";
		expdata[0][26] = "1003";
		expdata[0][27] = "1004";
		expdata[0][28] = "1005";
		expdata[0][29] = "1006";
		expdata[0][30] = "1007";
		expdata[0][31] = "1008";
		expdata[0][32] = "1009";
		expdata[0][33] = "1010";
		expdata[0][34] = "1011";
		expdata[0][35] = "1012";
		expdata[0][36] = "1013";
		expdata[0][37] = "1014";
		expdata[0][38] = "1015";
		expdata[0][39] = "1016";
		expdata[0][40] = "1017";
		expdata[0][41] = "1018";
		expdata[0][42] = "1019";
		expdata[0][43] = "1020";
		expdata[0][44] = "1021";
		expdata[0][45] = "1022";
		expdata[0][46] = "1023";
		expdata[0][47] = "";
		expdata[0][48] = "";				
		expdata[0][49] = "In Commmon With";

		//for (i = 0; i < z; i++){
		//	expdata[0][i+50] = matchstorage[matchkey][i].displayName;
		//}


		for (i = 0; i < z; i++){
			var pp = matchstorage[matchkey][i].testGuid;
			expdata[i+1][0] = pp;
			expdata[i+1][1] = matchstorage[matchkey][i].displayName;
			expdata[i+1][2] = matchstorage[matchkey][i].displayInitials;
			expdata[i+1][3] = matchstorage[matchkey][i].userId
			expdata[i+1][4] = matchstorage[matchkey][i].subjectGender;
			expdata[i+1][5] = matchstorage[matchkey][i].userPhoto;
			expdata[i+1][6] = matchstorage[matchkey][i].adminDisplayName;
			expdata[i+1][7] = matchstorage[matchkey][i].adminUcdmId;
			expdata[i+1][8] = matchstorage[matchkey][i].relationship.meiosis.toString();
			expdata[i+1][9] = matchstorage[matchkey][i].relationship.sharedCentimorgans.toString();
			expdata[i+1][10] = matchstorage[matchkey][i].relationship.sharedSegments.toString();
			expdata[i+1][11] = matchstorage[matchkey][i].relationship.confidence.toString();
			expdata[i+1][12] = matchstorage[matchkey][i].starred.toString();
			expdata[i+1][13] = matchstorage[matchkey][i].viewed.toString();
			expdata[i+1][14] = matchstorage[treekey][pp].commonAncestors;
			if (expdata[i+1][14] == undefined || expdata[i+1][14] == null){
				expdata[i+1][14] = "";
			} else {
				expdata[i+1][14] = expdata[i+1][14].toString();
			}			
			expdata[i+1][15] = matchstorage[treekey][pp].noTrees;
			if (expdata[i+1][15] == undefined || expdata[i+1][15] == null){
				expdata[i+1][15] = "";
			} else {
				expdata[i+1][15] = expdata[i+1][15].toString();
			}
			expdata[i+1][16] = matchstorage[treekey][pp].privateTree;
			if (expdata[i+1][16] == undefined || expdata[i+1][16] == null){
				expdata[i+1][16] = "";
			} else {
				expdata[i+1][16] = expdata[i+1][16].toString();
			}
			expdata[i+1][17] = matchstorage[treekey][pp].publicTree;
			if (expdata[i+1][17] == undefined || expdata[i+1][17] == null){
				expdata[i+1][17] = "";
			} else {
				expdata[i+1][17] = expdata[i+1][17].toString();
			}
			expdata[i+1][18] = matchstorage[treekey][pp].treeId;
			if (expdata[i+1][18] == undefined || expdata[i+1][18] == null){
				expdata[i+1][18] = "";
			} else {
				expdata[i+1][18] = expdata[i+1][18].toString();
			}
			expdata[i+1][19] = matchstorage[treekey][pp].treeSize;
			if (expdata[i+1][19] == undefined || expdata[i+1][19] == null){
				expdata[i+1][19] = "";
			} else {
				expdata[i+1][19] = expdata[i+1][19].toString();
			}
			expdata[i+1][20] = matchstorage[treekey][pp].unlinkedTree;
			if (expdata[i+1][20] == undefined || expdata[i+1][20] == null){
				expdata[i+1][20] = "";
			} else {
				expdata[i+1][20] = expdata[i+1][20].toString();
			}
			expdata[i+1][21] = matchstorage[treekey][pp].testGuid;
			expdata[i+1][22] = matchstorage[matchkey][i].note;

			// Turn array of tags into discrete flags
			// 1 is viewed, 2 is starred, 3 is note, 1000 to 1023 are user defined groups
			// The data already includes a flag for Viewed and Starred and if a note it is included
			// So only custom group flags will be processed and added to output
				
			var ta = matchstorage[matchkey][i].tags;
			var w = ta.length;
			for (j=0; j<w; j++){
				for (k=0; k<24; k++){  // There are 24 custom groups available
					if (ta[j] == expdata[0][k+23]){
						expdata[i+1][k+23] = "True";
					} else if (expdata[i+1][k+23] != "True"){
						expdata[i+1][k+23] = "";
					}
				}
			}
			expdata[i+1][47] = "";
			expdata[i+1][48] = "";
			expdata[i+1][49] = "";//matchstorage[matchkey][i].displayName;
			matchlist[i] = matchstorage[matchkey][i].testGuid;						
		}
		var chkicw = Object.keys(matchstorage[icwkey]);
		if (chkicw.length == z){
			for (i = 0; i<z; i++){
				var mm = matchlist[i];
				var y = matchstorage[icwkey][mm].length;
				for (j = 0; j<y; j++){
					expdata[i+1][j+50] = matchstorage[icwkey][mm][j];
				}
			}
		}
//		keyedmatchlist = {};

		var csv = [];
    	var end = expdata.length;
    	for (var j = 0; j < end; j++) {
			var item1 = expdata[j];
    		var row = [];
			//row.push(j + 1);
			for (var i = 0; i < item1.length; i++) {
				var c = item1[i];
				if(c == null || c == undefined){
					c = '';
				}
				else if(c != ''){
					c = c.replace(/"/g, '""');
	        	    if(c.search(/("|,|\n)/g) >= 0){
	        	        c = '"' + c + '"';
	        	    }
				}
				row.push(c);
			}
			csv.push(row.join(','))
		}

		var BOM = "\uFEFF";
    	var blob = new Blob([BOM + csv.join('\n')], { type: 'text/csv;charset=utf-8' });
    	var link = document.createElement("a");
    	if (link.download !== undefined) { // feature detection
        // Browsers that support HTML5 download attribute
        	var url = URL.createObjectURL(blob);
        	link.setAttribute("href", url);
        	link.setAttribute("download", 'matchdata-icwdata.csv');
        	link.style.visibility = 'hidden';
        	document.body.appendChild(link);
        	link.click();
        	document.body.removeChild(link);
    	}
    	var mcnt = matchstorage[matchkey].length;
		var mtxt = "Exported ";
		mtxt = mtxt.concat(mcnt, " matches");
		alert(mtxt);

	}	
}

function exportsep(){
	var keyedmatchlist = {};
	//var keyedmatchrow = {};
	if (matchstorage[matchkey] != undefined){
		var z = matchstorage[matchkey].length;
		var cnttree = Object.keys(matchstorage[treekey]);
		if (cnttree.length != z){
			console.log("Tree Information scan is not complete rerun scan matches")
			return;
		}
		// initialize array or arrays
		for (i = 0; i < z+1; i++){
			expdata[i] = [];
		}
		expdata[0][0] = "Match User ID";
		expdata[0][1] = "Match Name";
		expdata[0][2] = "Match Initials";
		expdata[0][3] = "Match Profile ID";
		expdata[0][4] = "Match Gender";
		expdata[0][5] = "Match Photo URL";
		expdata[0][6] = "Admin Name";
		expdata[0][7] = "Admin Profile ID";
		expdata[0][8] = "Relationship Group";
		expdata[0][9] = "Shared CM";
		expdata[0][10] = "Shared Segments";
		expdata[0][11] = "Confidence";
		expdata[0][12] = "Starred";
		expdata[0][13] = "Viewed";
		expdata[0][14] = "Common Ancestor";
		expdata[0][15] = "No Trees";
		expdata[0][16] = "Private Tree";
		expdata[0][17] = "Public Tree";
		expdata[0][18] = "Linked Tree ID";
		expdata[0][19] = "Tree Size";
		expdata[0][20] = "Unlinked Tree";
		expdata[0][21] = "Tree Match ID"
		expdata[0][22] = "Note";		
		expdata[0][23] = "1000";
		expdata[0][24] = "1001";
		expdata[0][25] = "1002";
		expdata[0][26] = "1003";
		expdata[0][27] = "1004";
		expdata[0][28] = "1005";
		expdata[0][29] = "1006";
		expdata[0][30] = "1007";
		expdata[0][31] = "1008";
		expdata[0][32] = "1009";
		expdata[0][33] = "1010";
		expdata[0][34] = "1011";
		expdata[0][35] = "1012";
		expdata[0][36] = "1013";
		expdata[0][37] = "1014";
		expdata[0][38] = "1015";
		expdata[0][39] = "1016";
		expdata[0][40] = "1017";
		expdata[0][41] = "1018";
		expdata[0][42] = "1019";
		expdata[0][43] = "1020";
		expdata[0][44] = "1021";
		expdata[0][45] = "1022";
		expdata[0][46] = "1023";

		for (i = 0; i < z; i++){
			var pp = matchstorage[matchkey][i].testGuid;
			expdata[i+1][0] = pp;
			expdata[i+1][1] = matchstorage[matchkey][i].displayName;
			expdata[i+1][2] = matchstorage[matchkey][i].displayInitials;
			expdata[i+1][3] = matchstorage[matchkey][i].userId
			expdata[i+1][4] = matchstorage[matchkey][i].subjectGender;
			expdata[i+1][5] = matchstorage[matchkey][i].userPhoto;
			expdata[i+1][6] = matchstorage[matchkey][i].adminDisplayName;
			expdata[i+1][7] = matchstorage[matchkey][i].adminUcdmId;
			expdata[i+1][8] = matchstorage[matchkey][i].relationship.meiosis.toString();
			expdata[i+1][9] = matchstorage[matchkey][i].relationship.sharedCentimorgans.toString();
			expdata[i+1][10] = matchstorage[matchkey][i].relationship.sharedSegments.toString();
			expdata[i+1][11] = matchstorage[matchkey][i].relationship.confidence.toString();
			expdata[i+1][12] = matchstorage[matchkey][i].starred.toString();
			expdata[i+1][13] = matchstorage[matchkey][i].viewed.toString();
			expdata[i+1][14] = matchstorage[treekey][pp].commonAncestors;
			if (expdata[i+1][14] == undefined || expdata[i+1][14] == null){
				expdata[i+1][14] = "";
			} else {
				expdata[i+1][14] = expdata[i+1][14].toString();
			}			
			expdata[i+1][15] = matchstorage[treekey][pp].noTrees;
			if (expdata[i+1][15] == undefined || expdata[i+1][15] == null){
				expdata[i+1][15] = "";
			} else {
				expdata[i+1][15] = expdata[i+1][15].toString();
			}
			expdata[i+1][16] = matchstorage[treekey][pp].privateTree;
			if (expdata[i+1][16] == undefined || expdata[i+1][16] == null){
				expdata[i+1][16] = "";
			} else {
				expdata[i+1][16] = expdata[i+1][16].toString();
			}
			expdata[i+1][17] = matchstorage[treekey][pp].publicTree;
			if (expdata[i+1][17] == undefined || expdata[i+1][17] == null){
				expdata[i+1][17] = "";
			} else {
				expdata[i+1][17] = expdata[i+1][17].toString();
			}
			expdata[i+1][18] = matchstorage[treekey][pp].treeId;
			if (expdata[i+1][18] == undefined || expdata[i+1][18] == null){
				expdata[i+1][18] = "";
			} else {
				expdata[i+1][18] = expdata[i+1][18].toString();
			}
			expdata[i+1][19] = matchstorage[treekey][pp].treeSize;
			if (expdata[i+1][19] == undefined || expdata[i+1][19] == null){
				expdata[i+1][19] = "";
			} else {
				expdata[i+1][19] = expdata[i+1][19].toString();
			}
			expdata[i+1][20] = matchstorage[treekey][pp].unlinkedTree;
			if (expdata[i+1][20] == undefined || expdata[i+1][20] == null){
				expdata[i+1][20] = "";
			} else {
				expdata[i+1][20] = expdata[i+1][20].toString();
			}
			expdata[i+1][21] = matchstorage[treekey][pp].testGuid;
			expdata[i+1][22] = matchstorage[matchkey][i].note;

			// Turn array of tags into discrete flags
			// 1 is viewed, 2 is starred, 3 is note, 1000 to 1023 are user defined groups
			// The data already includes a flag for Viewed and Starred and if a note it is included
			// So only custom group flags will be processed and added to output
				
			var ta = matchstorage[matchkey][i].tags;
			var w = ta.length;
			for (j=0; j<w; j++){
				for (k=0; k<24; k++){  // There are 24 custom groups available
					if (ta[j] == expdata[0][k+23]){
						expdata[i+1][k+23] = "True";
					} else if (expdata[i+1][k+23] != "True"){
						expdata[i+1][k+23] = "";
					}
				}
			}

			matchlist[i] = matchstorage[matchkey][i].testGuid;						
		}

		var csv = [];
    	var end = expdata.length;
    	for (var j = 0; j < end; j++) {
			var item1 = expdata[j];
    		var row = [];
			//row.push(j + 1);
			for (var i = 0; i < item1.length; i++) {
				var c = item1[i];
				if(c == null || c == undefined){
					c = '';
				}
				else if(c != ''){
					c = c.replace(/"/g, '""');
	        	    if(c.search(/("|,|\n)/g) >= 0){
	        	        c = '"' + c + '"';
	        	    }
				}
				row.push(c);
			}
			csv.push(row.join(','))
		}

		var BOM = "\uFEFF";
    	var blob = new Blob([BOM + csv.join('\n')], { type: 'text/csv;charset=utf-8' });
    	var link = document.createElement("a");
    	if (link.download !== undefined) { // feature detection
        // Browsers that support HTML5 download attribute
        	var url = URL.createObjectURL(blob);
        	link.setAttribute("href", url);
        	link.setAttribute("download", 'matchdata.csv');
        	link.style.visibility = 'hidden';
        	document.body.appendChild(link);
        	link.click();
        	document.body.removeChild(link);
    	}


// export the matrix as second file
		
		expdata = [];
		var cnti = Object.keys(matchstorage[icwkey]);
		if (cnti.length != null || cnti.length != undefined){
			cnti = cnti.length;
		} else {
			cnti = 0;
		}
		if (cnti != z){
			alert("Unable to generate ICW matrix as the ICW scan is incomplete.");
			return;
		}

		for (i = 0; i < z+1; i++){
			expdata[i] = [];
		}
		for (i = 0; i < z; i++){
			var pp = matchstorage[matchkey][i].testGuid;
			var murl = "https://www.ancestry.com/discoveryui-matches/compare-ng/";
			murl = murl.concat(procid,"/with/",pp);
			expdata[0][i+3]=matchstorage[matchkey][i].displayName;	
			expdata[i+1][0]=murl;
			expdata[i+1][1]=matchstorage[matchkey][i].displayName;
			var txt = "=hyperlink(A";
			txt = txt.concat(i+2,",B",i+2,")");
			expdata[i+1][2]= txt;

		}
		for (i = 0; i < z; i++){
			var keyedmatchrow = {};
			var mm = matchlist[i];
			for (j = 0; j < z; j++){
				var nn = matchlist[j];
				keyedmatchrow[nn] = "";
			}
			var y = matchstorage[icwkey][mm].length;
			keyedmatchrow[mm] = '--';
			for (k = 0; k < y; k++){
				var oo = matchstorage[icwkey][mm][k]
				keyedmatchrow[oo] = "X";
			}
			for (j = 0; j<z; j++){
				var nn = matchlist[j];
				expdata[i+1][j+3] = keyedmatchrow[nn];
			}

		}
		var keyedmatchrow = {};
		var csv = [];
    	var end = expdata.length;
    	for (var j = 0; j < end; j++) {
			var item1 = expdata[j];
    		var row = [];
			for (var i = 0; i < item1.length; i++) {
				var c = item1[i];
				if(c == null || c == undefined){
					c = '';
				}
				else if(c != ''){
					c = c.replace(/"/g, '""');
	        	    if(c.search(/("|,|\n)/g) >= 0){
	        	        c = '"' + c + '"';
	        	    }
				}
				row.push(c);
			}
			csv.push(row.join(','))
		}

		var BOM = "\uFEFF";
    	var blob = new Blob([BOM + csv.join('\n')], { type: 'text/csv;charset=utf-8' });
    	var link = document.createElement("a");
    	if (link.download !== undefined) { 
        	var url = URL.createObjectURL(blob);
        	link.setAttribute("href", url);
        	link.setAttribute("download", 'matrix.csv');
        	link.style.visibility = 'hidden';
        	document.body.appendChild(link);
        	link.click();
        	document.body.removeChild(link);
    	}
    	expdata = [];
		var mcnt = matchstorage[matchkey].length;
		var mtxt = "Exported ";
		mtxt = mtxt.concat(mcnt, " matches");
		alert(mtxt);
	}	
}

function icwcount(){
	if (icwinc < matchlist.length){
		icwcountwait = 1;
		document.getElementById('icwDisplay').innerHTML = icwinc + resumecnt; 
		icwurl = ancurl.concat(procid,"/matchlist/counts?relationsampleid=",matchlist[icwinc]);
		//countGetAsync(icwurl);
		icwreq();	
	} else {
		chrome.storage.local.set(matchstorage);
		//document.getElementById('icwcmDisplay').innerHTML = "";
		var m = Object.keys(matchstorage[icwkey]);
		var n = m.length;
		document.getElementById('icwDisplay').innerHTML = n;
		iwcinc = 0;
		icwstorage = {};
		icwlist = [];
		icwaddnew = 0;
		icwwait = 0;
		errorinc = 0;
		alert("Your ICW match scan is complete.  You may now export your matches or run the cluster tool.");

	}
}

function icwreq(){
	if (icwinc < matchlist.length){
		icwurl = ancurl.concat(procid,"/matchesv2?page=1&relationguid=",matchlist[icwinc]);
	    icwwait = 1;
	    errorinc = 0;
	    httpGetAsync(icwurl);
	}
}

function icwinfo()
{
	for (j = 0; j < matchrawdata.matchGroups.length; j++){
		for (k = 0; k < matchrawdata.matchGroups[j].matches.length; k++){
			icwlist[matchnum] = matchrawdata.matchGroups[j].matches[k].testGuid;
			matchnum = matchnum + 1;
			
		}
	}
	//document.getElementById('icwcmDisplay').innerHTML = matchnum; 
	icwstorage[matchlist[icwinc]] = icwlist;

	if (matchrawdata.matchCount < cntrtn){
		morematches = false;
	} else {
		morematches = matchrawdata.bookmarkData.moreMatchesAvailable;
	}
	
	if (morematches == true){ //pages
		scraperinc = scraperinc + 1;
		var z = scraperinc + 1;
		scrapeurl = matchesurl.concat("/matchesv2?page=",z.toString())
		z = JSON.stringify(matchrawdata.bookmarkData);
		scrapeurl = scrapeurl.concat("&relationguid=",matchlist[icwinc],"&bookmarkdata=",z);
		icwwait = 1;
		errorinc = 0;
		httpGetAsync(scrapeurl);	
	} 
	else
	{
		var txt = procid.concat("-icw");
   		var m = {};
    	m = matchstorage[txt];
    	// when adding a new match to ICW storage after initial scan we must update previously scanned matches with the new ICW
		if (icwaddnew == 1){
			var vv = icwlist.length;
			for (j=0; j<vv; j++){
				var ff = icwlist[j];
				if(m[ff] != null || m[ff] != undefined){
					var ee = m[ff].length;
					m[ff][ee] = matchlist[icwinc];
				}
				
			}
		}
    	matchstorage[txt] = Object.assign(icwstorage,m);
    	if (icwinc % 30 == 0){
        	chrome.storage.local.set(matchstorage);
        } 		
		matchnum = 0;
		scraperinc = 0;
		icwlist = [];
		icwinc = icwinc + 1;
		icwcount();

	}
}

function countGetAsync(theUrl)
{
    var cntHttp = new XMLHttpRequest();
    cntHttp.onreadystatechange = function() { 
        if (cntHttp.readyState == 4){
        	if (cntHttp.status == 200){
        		var n = cntHttp.responseURL;
            	var cntresponse = cntHttp.responseText;
            	//var n = theUrl.endswith("counts");
            	if (counturl == n && cntresponse != null){
            		//console.log(cntresponse)
            		counts = JSON.parse(cntresponse);
            		pages = counts.close;
            		document.getElementById('matchesDisplay').innerHTML = pages; 
            		pages = Math.ceil(pages / cntrtn);
            		console.log(pages)

	            }
        	    if (icwcountwait == 1 && cntresponse != null){
        	    	var temp = JSON.parse(cntresponse);
        	    	icwpages = temp.close;
        	    	icwpages = Math.ceil(icwpages / cntrtn)
        	    	icwcountwait = 0;
        	    	icwreq();
        	    }
        	} else {
        		var n = cntHttp.responseURL;
        		counterror(n);
            }
        }           
    }
    cntHttp.open("GET", theUrl, true); // true for asynchronous 
    //xmlHttp.withCredentials = true;

    cntHttp.send(null);
}

function counterror(theUrl)
{
	console.log('HTML Request error')
	console.log(theUrl)
	if (errorinc < 3) {
		errorinc = errorinc + 1;	
		countGetAsync(theUrl);	
	} else {
		alert("There was an error communicating with Ancestry Server try your scan again");
	}
}


function selectupdate()
{
	var sel = document.getElementById("Test-select");
    for(var i = sel.options.length - 1 ; i >= 1 ; i--)
    {
        sel.remove(i);
    }

	for (var i=0; i < sampleresponse.samples.complete.length; i++){					
		var opt = document.createElement("option");
	  	opt.value = sampleresponse.samples.complete[i].testGuid;
	  	opt.text = sampleresponse.samples.complete[i].displayName;
		sel.add(opt, sel.options[i+1]);
	}
}


	
